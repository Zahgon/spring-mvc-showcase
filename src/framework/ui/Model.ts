/**
 * `org.springframework.ui.Model` and `RedirectAttributes`.
 *
 * The model is asserted directly by several tests (`model().attribute(...)`,
 * `model().size(...)`), and `RedirectAttributes` distinguishes attributes that
 * become URI/query values from flash attributes that survive the redirect.
 */

export class Model {
  constructor(private readonly attributes: Map<string, unknown>) {}

  addAttribute(name: string, value: unknown): this {
    this.attributes.set(name, value);
    return this;
  }

  getAttribute(name: string): unknown {
    return this.attributes.get(name);
  }

  containsAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  asMap(): Map<string, unknown> {
    return this.attributes;
  }
}

export class RedirectAttributes extends Model {
  readonly flashAttributes = new Map<string, unknown>();

  /** Consumed as a URI template variable, or appended as a query parameter. */
  override addAttribute(name: string, value: unknown): this {
    return super.addAttribute(name, value);
  }

  addFlashAttribute(name: string, value: unknown): this {
    this.flashAttributes.set(name, value);
    return this;
  }
}
