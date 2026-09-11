"""Compares two captures of the rendered pages, block by block.

The status line and the response body have to match byte for byte. Headers are
compared as a set with the container's own removed: `Date`, `Server`,
`Connection` and the session cookie say nothing about the application, and
neither does the order the container writes them in.
"""
import re
import sys
import pathlib

CONTAINER_HEADERS = {
    'date', 'server', 'connection', 'keep-alive', 'transfer-encoding',
    'set-cookie', 'expires', 'content-length',
}
UUID = re.compile(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')

# Two things the original's container does that the application never asked
# for, and that a Node server has no equivalent of.
DEVIATIONS = {
    'GET /nosuchpath':
        "Jetty answers an unmapped path with its own error page, banner and all. "
        "The application declares no error page, so the port answers 404 with an "
        "empty body rather than imitating another server's.",
}
CHARSET_NOTE = (
    "Jetty lower-cases the charset in Content-Type on the way out. Spring itself "
    "writes ISO-8859-1 and UTF-8 in upper case -- that is what MockMvc records, "
    "and what the suite asserts -- so the port matches Spring rather than Jetty."
)


def blocks(text):
    result, label, lines = {}, None, []
    for line in text.split('\n'):
        if line.startswith('### '):
            if label is not None:
                result[label] = '\n'.join(lines)
            label, lines = line[4:], []
        elif line == '---8<---':
            if label is not None:
                result[label] = '\n'.join(lines)
            label, lines = None, []
        elif label is not None:
            lines.append(line)
    return result


def split(block):
    """A capture may hold several responses when curl followed a redirect."""
    status, headers, body = None, [], []
    lines = block.split('\n')
    index = 0
    while index < len(lines) and lines[index].startswith('HTTP/'):
        status = lines[index].split(' ', 1)[1]
        index += 1
        while index < len(lines) and lines[index] != '':
            name, _, value = lines[index].partition(':')
            if name.strip().lower() not in CONTAINER_HEADERS:
                headers.append(name.strip().lower() + ':' + value.strip())
            index += 1
        index += 1
    body = lines[index:]
    return status, sorted(headers), '\n'.join(body)


def normalise(text):
    return UUID.sub('<uuid>', text.replace('http://localhost:18080', '').replace('http://localhost:18081', ''))


def charset_only(want_headers, got_headers):
    """True when the header sets differ in the case of a charset and nothing else."""
    fold = lambda headers: sorted(re.sub(r'(charset=)(\S+)', lambda m: m.group(1) + m.group(2).lower(), h) for h in headers)
    return fold(want_headers) == fold(got_headers)


expected = blocks(pathlib.Path(sys.argv[1]).read_text(errors='replace'))
actual = blocks(pathlib.Path(sys.argv[2]).read_text(errors='replace'))

same = declared = 0
for label, want in expected.items():
    got = actual.get(label)
    if got is None:
        print('MISSING  ' + label)
        continue
    want_status, want_headers, want_body = split(normalise(want))
    got_status, got_headers, got_body = split(normalise(got))
    problems = []
    if want_status != got_status:
        problems.append('   status  java=%r ts=%r' % (want_status, got_status))
    for header in sorted(set(want_headers) - set(got_headers)):
        problems.append('   header only in java: ' + header)
    for header in sorted(set(got_headers) - set(want_headers)):
        problems.append('   header only in ts  : ' + header)
    if want_body != got_body:
        want_lines, got_lines = want_body.split('\n'), got_body.split('\n')
        shown = 0
        for index in range(max(len(want_lines), len(got_lines))):
            a = want_lines[index] if index < len(want_lines) else '<absent>'
            b = got_lines[index] if index < len(got_lines) else '<absent>'
            if a != b and shown < 5:
                problems.append('   body line %d\n     java: %r\n     ts  : %r' % (index + 1, a, b))
                shown += 1
        if shown == 0:
            problems.append('   body differs in trailing content only')
    if not problems:
        same += 1
        continue
    if label in DEVIATIONS:
        declared += 1
        print('DECLARED DEVIATION  ' + label)
        print('   ' + DEVIATIONS[label])
        continue
    if want_status == got_status and want_body == got_body and charset_only(want_headers, got_headers):
        declared += 1
        print('DECLARED DEVIATION  ' + label)
        print('   ' + CHARSET_NOTE)
        continue
    print('DIFFER   ' + label)
    for problem in problems:
        print(problem)

print('\n%d/%d rendered pages identical, %d declared deviation(s)' % (same, len(expected), declared))
