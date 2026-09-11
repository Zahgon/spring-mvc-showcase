/**
 * `org.springframework.validation.BindingResult`.
 *
 * Carries the field errors from binding and validation. The counts and the
 * field names are asserted directly — `POST /form` with no parameters must
 * report exactly two errors, on `name` and `age`.
 */


export interface FieldError {
  readonly objectName: string;
  readonly field: string;
  readonly rejectedValue: unknown;
  readonly code: string;
  readonly defaultMessage: string;
  /** True when the value never reached the property, as a conversion failure. */
  readonly bindingFailure: boolean;
}

export class BindingResult {
  private readonly errors: FieldError[] = [];

  constructor(
    readonly objectName: string,
    readonly target: object,
  ) {}

  rejectValue(
    field: string,
    code: string,
    defaultMessage: string,
    rejectedValue: unknown,
    bindingFailure = false,
  ): void {
    this.errors.push({
      objectName: this.objectName,
      field,
      rejectedValue,
      code,
      defaultMessage,
      bindingFailure,
    });
  }

  /** `BindingResult.getFieldError(field)`, which answers with the first. */
  getFieldError(field: string): FieldError | undefined {
    return this.errors.find((error) => error.field === field);
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrorCount(): number {
    return this.errors.length;
  }

  getFieldErrors(): readonly FieldError[] {
    return this.errors;
  }

  hasFieldErrors(field: string): boolean {
    return this.errors.some((error) => error.field === field);
  }

  /** `BeanPropertyBindingResult: N errors`, as the model renders it. */
  toString(): string {
    return (
      'org.springframework.validation.BeanPropertyBindingResult: ' +
      String(this.errors.length) +
      ' errors'
    );
  }

  /** The model key Spring stores a BindingResult under. */
  static modelKey(objectName: string): string {
    return 'org.springframework.validation.BindingResult.' + objectName;
  }
}
