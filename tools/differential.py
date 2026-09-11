#!/usr/bin/env python3
"""Diffs the migrated probe's output against the Java original's, block by block.

The Java side was captured once from the running application with MockMvc; the
migrated side is replayed by tools/http-probe.ts. Blocks the port has not
reached yet report UNMAPPED and are counted separately from mismatches, so this
doubles as a progress meter while the migration widens.
"""
import json
import re
import subprocess
import sys
import pathlib

GOLDEN = pathlib.Path(sys.argv[1])
DEVIATIONS = json.loads(pathlib.Path('tools/known-deviations.json').read_text())


def blocks(text):
    result, label, lines = {}, None, []
    for line in text.splitlines():
        if line.startswith('### '):
            if label is not None:
                result[label] = lines
            label, lines = line[4:], []
        elif line == '---':
            if label is not None:
                result[label] = lines
            label, lines = None, []
        elif label is not None:
            lines.append(line)
    if label is not None:
        result[label] = lines
    return result


def normalise(lines):
    out = []
    for line in lines:
        # identity hashes and session ids are not reproducible across runtimes
        line = re.sub(r'@[0-9a-f]{3,}', '@<identity>', line)
        line = re.sub(r'session-\d+', '@<identity>', line)
        out.append(line)
    return out


java = blocks(GOLDEN.read_text(errors='replace'))
migrated = blocks(subprocess.run(
    ['npx', 'tsx', 'tools/http-probe.ts'], capture_output=True, text=True, check=True).stdout)

match = differ = unmapped = declared = 0
for label, expected in java.items():
    actual = migrated.get(label)
    if actual is None:
        continue
    if actual == ['UNMAPPED']:
        unmapped += 1
        continue
    if normalise(actual) == normalise(expected):
        match += 1
    elif label in DEVIATIONS:
        declared += 1
        print('DECLARED DEVIATION  ' + label)
        print('   ' + DEVIATIONS[label])
    else:
        differ += 1
        print('DIFFER  ' + label)
        for line in expected:
            if line not in actual:
                print('   java only: ' + line)
        for line in actual:
            if line not in expected:
                print('   ts only  : ' + line)

covered = match + differ + declared
print()
print(f'{match}/{covered} replayed endpoints identical, '
      f'{declared} declared deviation(s); {unmapped} not ported yet')
sys.exit(1 if differ else 0)
