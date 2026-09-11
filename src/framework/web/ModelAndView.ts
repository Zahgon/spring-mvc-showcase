/** `org.springframework.web.servlet.ModelAndView`. */
export class ModelAndView {
  readonly model = new Map<string, unknown>();

  constructor(
    readonly viewName: string,
    attributeName?: string,
    attributeValue?: unknown,
  ) {
    if (attributeName !== undefined) {
      this.model.set(attributeName, attributeValue);
    }
  }

  getViewName(): string {
    return this.viewName;
  }

  addObject(name: string, value: unknown): this {
    this.model.set(name, value);
    return this;
  }
}
