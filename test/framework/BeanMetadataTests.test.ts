/**
 * Every command object's declared metadata against its actual accessors.
 *
 * TypeScript keeps no reflection, so each bean states its own properties for
 * the binder, the validator and the message converters to read. If a declared
 * property has no matching getter and setter the binder silently writes a field
 * nobody reads and Jackson silently serialises nothing — which is exactly the
 * kind of defect a per-endpoint test does not catch. This checks the two agree,
 * for every bean the showcase declares.
 */

import { describe, expect, test } from 'vitest';
import { beanMetadataOfClass, propertyEntries } from '../../src/framework/bind/BeanMetadata.js';
import { JavaBean as AsyncBean } from '../../src/samples/mvc/async/JavaBean.js';
import { JavaBean as ConvertBean } from '../../src/samples/mvc/convert/JavaBean.js';
import { NestedBean } from '../../src/samples/mvc/convert/NestedBean.js';
import { JavaBean as DataBean } from '../../src/samples/mvc/data/JavaBean.js';
import { FormBean } from '../../src/samples/mvc/form/FormBean.js';
import { JavaBean as MappingBean } from '../../src/samples/mvc/mapping/JavaBean.js';
import { JavaBean as ConvertersBean } from '../../src/samples/mvc/messageconverters/JavaBean.js';
import { JavaBean as ValidationBean } from '../../src/samples/mvc/validation/JavaBean.js';
import { JavaBean as ViewsBean } from '../../src/samples/mvc/views/JavaBean.js';
import { SocialSecurityNumber } from '../../src/samples/mvc/convert/SocialSecurityNumber.js';
import { objectToString } from '../../src/java/lang/Objects.js';

/**
 * Each bean with the constructor it actually declares — `async/JavaBean` takes
 * its two properties, as the original's does, and the rest are no-arg.
 */
const BEANS: [string, () => object][] = [
  ['async', () => new AsyncBean('bar', 'apple')],
  ['convert', () => new ConvertBean()],
  ['convert.NestedBean', () => new NestedBean()],
  ['data', () => new DataBean()],
  ['form', () => new FormBean()],
  ['mapping', () => new MappingBean()],
  ['messageconverters', () => new ConvertersBean()],
  ['validation', () => new ValidationBean()],
  ['views', () => new ViewsBean()],
];

/** A value the property's declared type will accept. */
function sampleFor(kind: string): unknown {
  switch (kind) {
    case 'string':
      return 'sample';
    case 'integer':
    case 'long':
      return 42;
    case 'boolean':
      return true;
    case 'list':
      return [];
    case 'map':
      return new Map();
    default:
      return null;
  }
}

function accessors(name: string): { getter: string; setter: string } {
  const capital = name.charAt(0).toUpperCase() + name.slice(1);
  return { getter: 'get' + capital, setter: 'set' + capital };
}

describe.each(BEANS)('%s bean', (_label, create) => {
  const metadata = beanMetadataOfClass(create().constructor)!;

  test('declares metadata', () => {
    expect(metadata).toBeDefined();
    expect(propertyEntries(metadata).length).toBeGreaterThan(0);
  });

  test('every declared property round-trips through its accessors', () => {
    for (const [name, declaration] of propertyEntries(metadata)) {
      const bean = create() as Record<string, unknown>;
      const { getter, setter } = accessors(name);
      // A boolean reads back through `isX()`, as JavaBeans does.
      const reader =
        typeof bean[getter] === 'function' ? getter : 'is' + name.charAt(0).toUpperCase() + name.slice(1);
      expect(typeof bean[setter], `${metadata.name}.${setter}`).toBe('function');
      expect(typeof bean[reader], `${metadata.name}.${reader}`).toBe('function');

      const sample = sampleFor(declaration.type.kind);
      (bean[setter] as (value: unknown) => void).call(bean, sample);
      expect((bean[reader] as () => unknown).call(bean), `${metadata.name}.${name}`).toEqual(sample);
    }
  });
});

describe('SocialSecurityNumber', () => {
  test('wrapsTheDigitsTheMaskLeftBehind', () => {
    // `@MaskFormat("###-##-####")` strips the literals before `valueOf` sees
    // the string, so the value object holds the digits alone.
    const ssn = SocialSecurityNumber.valueOf('123456789');
    expect(ssn.getValue()).toBe('123456789');
  });

  test('printsAsAnObjectWithNoToStringOfItsOwn', () => {
    // The original declares none either, which is why `/convert/value` answers
    // `Converted value object org.springframework...SocialSecurityNumber@2ab2bc6`.
    expect(objectToString(SocialSecurityNumber.valueOf('123456789'))).toMatch(
      /^org\.springframework\.samples\.mvc\.convert\.SocialSecurityNumber@[0-9a-f]{8}$/,
    );
  });
});
