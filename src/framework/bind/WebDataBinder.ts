/**
 * `org.springframework.validation.DataBinder` over a `BeanWrapper`.
 *
 * This is the piece behind `/convert/bean` and `POST /form`: a flat set of
 * request parameters becomes a populated object graph, growing lists and maps
 * on dereference and creating intermediate beans as it goes.
 *
 * Two behaviours here were established by running the original rather than by
 * reading it. Property values are applied **sorted by name**, because
 * `ServletRequestParameterPropertyValues` collects them through
 * `WebUtils.getParametersStartingWith`, which returns a `TreeMap` — that is why
 * `map[1]=pear&map[0]=apple` still yields `{0=apple, 1=pear}`, and why
 * `additionalInfo[mvc]` before `additionalInfo[java]` yields
 * `{java=true, mvc=true}`. And a `_`-prefixed field marker binds the *empty*
 * value for its field when the field itself is absent — an unchecked box is
 * `false`, an unticked map entry is a key with no value — which is why
 * `additionalInfo` comes back as `{java=null, mvc=true}` rather than losing the
 * key altogether.
 */

import { beanMetadataOfClass, type BeanMetadata, type PropertyMetadata } from './BeanMetadata.js';
import type { Declaration, TypeDescriptor } from '../convert/TypeDescriptor.js';
import { ConversionFailedException, type FormattingConversionService } from '../convert/ConversionService.js';
import type { BindingResult } from './BindingResult.js';

interface PathStep {
  readonly property: string;
  /** `[0]` or `[key]`, when the step indexes into a list or a map. */
  readonly index: string | null;
}

function parsePath(path: string): PathStep[] {
  return path.split('.').map((segment) => {
    const bracket = segment.indexOf('[');
    if (bracket < 0) {
      return { property: segment, index: null };
    }
    return { property: segment.slice(0, bracket), index: segment.slice(bracket + 1, -1) };
  });
}

export class WebDataBinder {
  constructor(
    private readonly conversionService: FormattingConversionService,
    private readonly result: BindingResult,
  ) {}

  /** `DataBinder.bind(PropertyValues)`. */
  bind(target: object, values: Map<string, string[]>): void {
    const empty = new Set<string>();
    for (const name of values.keys()) {
      if (name.startsWith('_') && !values.has(name.slice(1))) {
        empty.add(name.slice(1));
      }
    }
    const names = [...new Set([...values.keys(), ...empty])]
      .filter((name) => !name.startsWith('_'))
      .sort();
    for (const name of names) {
      if (empty.has(name)) {
        this.setEmptyValue(target, name);
        continue;
      }
      const raw = values.get(name)!;
      try {
        this.setPropertyValue(target, name, raw);
      } catch (error) {
        if (error instanceof ConversionFailedException) {
          this.result.rejectValue(
            name,
            'typeMismatch',
            typeMismatchMessage(name, this.declarationFor(target, name), error),
            raw[0],
            true,
          );
          continue;
        }
        throw error;
      }
    }
  }

  /** The declared property a path ends at, for the message the failure needs. */
  private declarationFor(root: object, path: string): PropertyMetadata | undefined {
    let metadata = beanMetadataOfClass(root.constructor);
    let property: PropertyMetadata | undefined;
    for (const step of parsePath(path)) {
      property = metadata?.properties[step.property];
      if (property === undefined) {
        return undefined;
      }
      metadata = beanMetadataOfClass(Object);
    }
    return property;
  }

  /** `WebDataBinder.getEmptyValue`: `false` for a boolean, null for the rest. */
  private setEmptyValue(root: object, path: string): void {
    const steps = parsePath(path);
    let holder: object = root;
    let metadata = beanMetadataOfClass(root.constructor);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const property = metadata?.properties[step.property];
      if (property === undefined) {
        return;
      }
      const last = i === steps.length - 1;
      if (last && step.index === null) {
        writeProperty(holder, step.property, property.type.kind === 'boolean' ? false : null);
        return;
      }
      const container = this.growContainer(holder, step.property, property);
      if (step.index === null) {
        holder = container as object;
        metadata = beanMetadataOfClass(holder.constructor);
        continue;
      }
      if (last) {
        const element = elementOf(property.type);
        this.setElement(
          container,
          property.type,
          step.index,
          element.type.kind === 'boolean' ? false : null,
        );
        return;
      }
      return;
    }
  }

  private setPropertyValue(root: object, path: string, raw: string[]): void {
    const steps = parsePath(path);
    let holder: object = root;
    let metadata = beanMetadataOfClass(root.constructor);
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const property = metadata?.properties[step.property];
      if (property === undefined) {
        return;
      }
      const last = i === steps.length - 1;
      if (last && step.index === null) {
        writeProperty(holder, step.property, this.convertValue(raw, property));
        return;
      }
      if (step.index !== null && last) {
        // The value is converted before the container is reached, so a value
        // that will not convert leaves the property as it was. `list[0]=apple`
        // on a `List<Integer>` reports a field error and leaves `list` null,
        // rather than leaving an empty list behind.
        const converted = this.convertValue(raw, elementOf(property.type));
        const grown = this.growContainer(holder, step.property, property);
        this.setElement(grown, property.type, step.index, converted);
        return;
      }
      const container = this.growContainer(holder, step.property, property);
      if (step.index === null) {
        // A nested bean: descend into it.
        holder = container as object;
        metadata = beanMetadataOfClass(holder.constructor);
        continue;
      }
      const elementDeclaration = elementOf(property.type);
      let element = this.getElement(container, property.type, step.index);
      if (element === undefined || element === null) {
        element = createValue(elementDeclaration.type);
        this.setElement(container, property.type, step.index, element);
      }
      holder = element as object;
      metadata = beanMetadataOfClass(holder.constructor);
    }
  }

  private convertValue(raw: string[], declaration: Declaration): unknown {
    if (declaration.type.kind === 'list' && raw.length > 1) {
      return raw.map((value) => this.conversionService.convert(value, elementOf(declaration.type)));
    }
    return this.conversionService.convert(raw[0] ?? '', declaration);
  }

  /** `AbstractNestablePropertyAccessor.growCollectionIfNecessary`. */
  private growContainer(holder: object, property: string, declaration: PropertyMetadata): unknown {
    const current = readProperty(holder, property);
    if (current !== undefined && current !== null) {
      return current;
    }
    const created = createValue(declaration.type);
    writeProperty(holder, property, created);
    return created;
  }

  private getElement(container: unknown, type: TypeDescriptor, index: string): unknown {
    if (type.kind === 'list') {
      return (container as unknown[])[Number.parseInt(index, 10)];
    }
    if (type.kind === 'map') {
      return (container as Map<unknown, unknown>).get(this.convertKey(type, index));
    }
    return undefined;
  }

  private setElement(container: unknown, type: TypeDescriptor, index: string, value: unknown): void {
    if (type.kind === 'list') {
      const list = container as unknown[];
      const position = Number.parseInt(index, 10);
      while (list.length < position) {
        list.push(null);
      }
      list[position] = value;
      return;
    }
    if (type.kind === 'map') {
      (container as Map<unknown, unknown>).set(this.convertKey(type, index), value);
    }
  }

  private convertKey(type: TypeDescriptor, index: string): unknown {
    return type.kind === 'map' ? this.conversionService.convert(index, { type: type.key }) : index;
  }
}

function elementOf(type: TypeDescriptor): Declaration {
  if (type.kind === 'list') {
    return type.element;
  }
  if (type.kind === 'map') {
    return type.value;
  }
  return { type };
}

function createValue(type: TypeDescriptor): unknown {
  switch (type.kind) {
    case 'list':
      return [];
    case 'map':
      // Spring grows a `Map` property into a LinkedHashMap; insertion order is
      // what the rendered `{k=v, k=v}` shows, and the sorted application order
      // above is what makes that deterministic.
      return new Map<unknown, unknown>();
    case 'bean':
      return type.create();
    default:
      return null;
  }
}

export type { BeanMetadata };

/**
 * `BeanWrapper` reaches a property through its accessors, not through the
 * field: a setter that did more than assign would still run.
 */
function writeProperty(holder: object, property: string, value: unknown): void {
  const setter = 'set' + property.charAt(0).toUpperCase() + property.slice(1);
  const target = holder as Record<string, unknown>;
  if (typeof target[setter] === 'function') {
    (target[setter] as (argument: unknown) => void).call(holder, value);
    return;
  }
  target[property] = value;
}

function readProperty(holder: object, property: string): unknown {
  const getter = 'get' + property.charAt(0).toUpperCase() + property.slice(1);
  const target = holder as Record<string, unknown>;
  if (typeof target[getter] === 'function') {
    return (target[getter] as () => unknown).call(holder);
  }
  return target[property];
}

/**
 * The Java type name a `TypeDescriptor` stands for. `int` and `boolean` are the
 * primitives the form declares, and a primitive names itself in the message.
 */
function javaTypeName(property: PropertyMetadata | undefined): string {
  switch (property?.type.kind) {
    case 'string':
      return 'java.lang.String';
    case 'integer':
      return property.primitive === true ? 'int' : 'java.lang.Integer';
    case 'long':
      return property.primitive === true ? 'long' : 'java.lang.Long';
    case 'boolean':
      return property.primitive === true ? 'boolean' : 'java.lang.Boolean';
    case 'date':
      return 'java.util.Date';
    case 'localDate':
      return 'org.joda.time.LocalDate';
    case 'bigDecimal':
      return 'java.math.BigDecimal';
    case 'enum':
      return property.type.name;
    default:
      return 'java.lang.Object';
  }
}

/** The annotations on the field, in the order they are declared on it. */
function annotationsOf(property: PropertyMetadata | undefined): string[] {
  const format = property?.format ?? {};
  const names: string[] = [];
  if (format.isoDate !== undefined) {
    names.push('@org.springframework.format.annotation.DateTimeFormat');
  }
  if (format.maskFormat !== undefined) {
    names.push('@org.springframework.samples.mvc.convert.MaskFormat');
  }
  if (format.numberPattern !== undefined || format.numberPercent !== undefined) {
    names.push('@org.springframework.format.annotation.NumberFormat');
  }
  for (const constraint of property?.constraints ?? []) {
    switch (constraint.kind) {
      case 'past':
        names.push('@javax.validation.constraints.Past');
        break;
      case 'future':
        names.push('@javax.validation.constraints.Future');
        break;
      case 'min':
        names.push('@javax.validation.constraints.Min');
        break;
      case 'max':
        names.push('@javax.validation.constraints.Max');
        break;
      case 'notEmpty':
        names.push('@org.hibernate.validator.constraints.NotEmpty');
        break;
      case 'notNull':
        names.push('@javax.validation.constraints.NotNull');
        break;
    }
  }
  return names;
}

/**
 * `TypeMismatchException.getMessage()`.
 *
 * Which nested exception it reports is decided by `TypeConverterDelegate`: it
 * tries the conversion service first, and on failure falls back to whatever
 * default `PropertyEditor` the required type has. The numeric types have one,
 * so their own `NumberFormatException` is what surfaces; `java.util.Date` and
 * `java.lang.String` have none, so the conversion failure is rethrown.
 */
function typeMismatchMessage(
  path: string,
  property: PropertyMetadata | undefined,
  error: ConversionFailedException,
): string {
  const required = javaTypeName(property);
  const nested = hasDefaultEditor(property)
    ? 'java.lang.NumberFormatException: ' + error.causeMessage
    : 'org.springframework.core.convert.ConversionFailedException: Failed to convert from type ' +
      '[java.lang.String] to type [' +
      [...annotationsOf(property), required].join(' ') +
      '] for value ' +
      error.value +
      '; nested exception is ' +
      error.causeClass +
      ': ' +
      error.causeMessage;
  return (
    'Failed to convert property value of type java.lang.String to required type ' +
    required +
    ' for property ' +
    path +
    '; nested exception is ' +
    nested
  );
}

/** The types `PropertyEditorRegistrySupport` registers a default editor for. */
function hasDefaultEditor(property: PropertyMetadata | undefined): boolean {
  const kind = property?.type.kind;
  return kind === 'integer' || kind === 'long' || kind === 'bigDecimal' || kind === 'boolean';
}
