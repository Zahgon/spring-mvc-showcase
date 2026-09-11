/**
 * The declared type of a handler parameter or a bean property.
 *
 * Java hands Spring `Integer.class`, `List<Date>` and the annotations on the
 * declaration; TypeScript erases all of it. Every binding target therefore
 * declares its type here, which is what lets `values=1,2,3` become a list of
 * integers and `2010-07-04` become a `Date`.
 */

export interface FormatAnnotations {
  /** `@DateTimeFormat(iso=ISO.DATE)`. */
  readonly isoDate?: true;
  /** `@NumberFormat(pattern=...)`. */
  readonly numberPattern?: string;
  /** `@NumberFormat(style=Style.PERCENT)`. */
  readonly numberPercent?: true;
  /** The showcase's own `@MaskFormat(...)`. */
  readonly maskFormat?: string;
}

export type TypeDescriptor =
  | { readonly kind: 'string' }
  | { readonly kind: 'integer' }
  | { readonly kind: 'long' }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'date' }
  | { readonly kind: 'localDate' }
  | { readonly kind: 'bigDecimal' }
  | { readonly kind: 'enum'; readonly name: string; readonly values: readonly string[] }
  | { readonly kind: 'list'; readonly element: Declaration }
  | { readonly kind: 'map'; readonly key: TypeDescriptor; readonly value: Declaration }
  | { readonly kind: 'bean'; readonly name: string; readonly create: () => object }
  | {
      readonly kind: 'valueObject';
      readonly name: string;
      readonly valueOf: (text: string) => object;
      readonly parameter: FormatAnnotations;
    }
  | { readonly kind: 'feed' }
  | { readonly kind: 'channel' }
  | { readonly kind: 'multipartFile' }
  | { readonly kind: 'any' };

/** A declared binding target: its type plus the format annotations on it. */
export interface Declaration {
  readonly type: TypeDescriptor;
  readonly format?: FormatAnnotations;
}

export const Types = {
  String: { kind: 'string' } as TypeDescriptor,
  Integer: { kind: 'integer' } as TypeDescriptor,
  Long: { kind: 'long' } as TypeDescriptor,
  Boolean: { kind: 'boolean' } as TypeDescriptor,
  Date: { kind: 'date' } as TypeDescriptor,
  LocalDate: { kind: 'localDate' } as TypeDescriptor,
  BigDecimal: { kind: 'bigDecimal' } as TypeDescriptor,
  MultipartFile: { kind: 'multipartFile' } as TypeDescriptor,
  Feed: { kind: 'feed' } as TypeDescriptor,
  Channel: { kind: 'channel' } as TypeDescriptor,
  Any: { kind: 'any' } as TypeDescriptor,

  listOf(element: Declaration): TypeDescriptor {
    return { kind: 'list', element };
  },
  mapOf(key: TypeDescriptor, value: Declaration): TypeDescriptor {
    return { kind: 'map', key, value };
  },
  /**
   * A command object, and the factory `@ModelAttribute` uses to create it when
   * the model does not already hold one.
   */
  bean(name: string, create: () => object): TypeDescriptor {
    return { kind: 'bean', name, create };
  },
  enumOf(name: string, values: readonly string[]): TypeDescriptor {
    return { kind: 'enum', name, values };
  },
  valueObject(
    name: string,
    valueOf: (text: string) => object,
    parameter: FormatAnnotations = {},
  ): TypeDescriptor {
    return { kind: 'valueObject', name, valueOf, parameter };
  },
} as const;
