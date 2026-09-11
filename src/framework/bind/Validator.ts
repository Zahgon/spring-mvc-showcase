/**
 * The JSR-303 subset the showcase declares, with Hibernate Validator's
 * behaviour: `@NotNull`, `@NotEmpty`, `@Min`, `@Max`, `@Past`, `@Future`.
 *
 * The error *count* is asserted — `POST /form` with no parameters must report
 * exactly two — so a constraint that does not apply must not fire. In
 * particular `@NotNull`/`@Min` on a primitive `int` see the default `0`, not
 * `null`, which is why the empty form reports `age` for `@Min(21)` and not for
 * a null check.
 */

import { JavaDate } from '../../java/util/Date.js';
import { beanMetadataOfClass, propertyEntries, type Constraint } from './BeanMetadata.js';
import type { BindingResult } from './BindingResult.js';

export function validate(target: object, result: BindingResult): void {
  const metadata = beanMetadataOfClass(target.constructor);
  if (metadata === undefined) {
    return;
  }
  for (const [property, declaration] of propertyEntries(metadata)) {
    // A field that failed to bind holds whatever it held before, so judging it
    // would report a constraint the submitter never violated.
    if (result.getFieldError(property)?.bindingFailure === true) {
      continue;
    }
    const value = (target as Record<string, unknown>)[property];
    for (const constraint of declaration.constraints ?? []) {
      if (!satisfies(constraint, value)) {
        result.rejectValue(property, codeFor(constraint), constraint.message, value ?? null);
      }
    }
  }
}

function codeFor(constraint: Constraint): string {
  switch (constraint.kind) {
    case 'notNull':
      return 'NotNull';
    case 'notEmpty':
      return 'NotEmpty';
    case 'min':
      return 'Min';
    case 'max':
      return 'Max';
    case 'past':
      return 'Past';
    case 'future':
      return 'Future';
    default:
      return 'Constraint';
  }
}

function satisfies(constraint: Constraint, value: unknown): boolean {
  switch (constraint.kind) {
    case 'notNull':
      return value !== null && value !== undefined;
    case 'notEmpty':
      // Hibernate's @NotEmpty passes on null? No: it fails on null and on "".
      return typeof value === 'string' ? value.length > 0 : value !== null && value !== undefined;
    case 'min':
      return typeof value === 'number' ? value >= (constraint.value ?? 0) : true;
    case 'max':
      return typeof value === 'number' ? value <= (constraint.value ?? 0) : true;
    case 'past':
      return value instanceof JavaDate ? value.getTime() < Date.now() : true;
    case 'future':
      return value instanceof JavaDate ? value.getTime() > Date.now() : true;
    default:
      return true;
  }
}
