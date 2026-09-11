/**
 * The property information Spring reads off a command object with
 * `BeanWrapper`, declared explicitly because TypeScript keeps none of it.
 *
 * Each property carries its declared type, the format annotations on it and
 * any JSR-303 constraints, which together are what the binder, the message
 * converters and the validator all need.
 */

import type { Declaration } from '../convert/TypeDescriptor.js';

export type ConstraintKind = 'notNull' | 'notEmpty' | 'min' | 'max' | 'past' | 'future';

export interface Constraint {
  readonly kind: ConstraintKind;
  readonly value?: number;
  /** The default message Hibernate Validator produces. */
  readonly message: string;
}

export interface PropertyMetadata extends Declaration {
  readonly constraints?: readonly Constraint[];
  /** Declared as a Java primitive rather than as its wrapper. */
  readonly primitive?: boolean;
}

export interface BeanMetadata {
  /** The fully-qualified name the class had in the original. */
  readonly name: string;
  /** `@XmlRootElement`: the element name, decapitalised from the class name. */
  readonly xmlRootElement?: string;
  readonly properties: Readonly<Record<string, PropertyMetadata>>;
}

const BEANS = new WeakMap<object, BeanMetadata>();

export function Bean(metadata: BeanMetadata) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function decorate<T extends abstract new (...args: any[]) => object>(ctor: T): T {
    BEANS.set(ctor, metadata);
    return ctor;
  };
}

export function beanMetadataOf(target: object): BeanMetadata | undefined {
  const ctor: unknown = (target as { constructor?: unknown }).constructor;
  return typeof ctor === 'function' ? BEANS.get(ctor as object) : undefined;
}

export function beanMetadataOfClass(ctor: object): BeanMetadata | undefined {
  return BEANS.get(ctor);
}

/** Every declared property of a bean, in declaration order. */
export function propertyEntries(metadata: BeanMetadata): [string, PropertyMetadata][] {
  return Object.keys(metadata.properties).map((name) => [name, metadata.properties[name]!]);
}

/** The JSR-303 constraints, with Hibernate Validator's default messages. */
export const Constraints = {
  notNull: (): Constraint => ({ kind: 'notNull', message: 'may not be null' }),
  notEmpty: (): Constraint => ({ kind: 'notEmpty', message: 'may not be empty' }),
  min: (value: number): Constraint => ({
    kind: 'min',
    value,
    message: 'must be greater than or equal to ' + String(value),
  }),
  max: (value: number): Constraint => ({
    kind: 'max',
    value,
    message: 'must be less than or equal to ' + String(value),
  }),
  past: (): Constraint => ({ kind: 'past', message: 'must be in the past' }),
  future: (): Constraint => ({ kind: 'future', message: 'must be in the future' }),
} as const;
