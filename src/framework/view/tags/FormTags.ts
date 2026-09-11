/**
 * `org.springframework.web.servlet.tags.form`, the tag library `form.jsp`
 * renders itself with.
 *
 * A tag never invents a value: it asks the `BindStatus` for the path, which
 * answers with the rejected input when binding failed on that field and with
 * the formatted property value otherwise. That is why a submitted `age=abc`
 * comes back in the field as `abc` while a bound `currency` comes back as
 * `$4.20`.
 */

import type { BindingResult, FieldError } from '../../bind/BindingResult.js';
import type { FormattingConversionService } from '../../convert/ConversionService.js';
import { beanMetadataOf, type BeanMetadata } from '../../bind/BeanMetadata.js';
import { htmlEscape } from './Html.js';

/** `org.springframework.web.servlet.support.BindStatus`. */
export class BindStatus {
  constructor(
    private readonly target: object,
    private readonly bindingResult: BindingResult | null,
    private readonly conversionService: FormattingConversionService,
  ) {}

  private metadata(): BeanMetadata | undefined {
    return beanMetadataOf(this.target);
  }

  errors(path: string): readonly FieldError[] {
    return (this.bindingResult?.getFieldErrors() ?? []).filter((error) => error.field === path);
  }

  /** Whether `<s:bind path="*">` would report `status.error`. */
  hasErrors(): boolean {
    return this.bindingResult?.hasErrors() ?? false;
  }

  /**
   * The string a field renders with. A rejected value is echoed back exactly as
   * it was typed, because the property never took it.
   */
  displayValue(path: string): string {
    const rejected = this.errors(path)[0];
    if (rejected !== undefined) {
      return rejected.rejectedValue === null || rejected.rejectedValue === undefined
        ? ''
        : String(rejected.rejectedValue);
    }
    return this.conversionService.printValue(this.value(path), this.declarationOf(path));
  }

  /** The bound value itself, for the tags that compare rather than print. */
  value(path: string): unknown {
    const indexed = /^([^[]+)\[(.+)\]$/.exec(path);
    const name = indexed === null ? path : indexed[1]!;
    const getter = 'get' + name.charAt(0).toUpperCase() + name.slice(1);
    const holder = this.target as Record<string, unknown>;
    const read: unknown =
      typeof holder[getter] === 'function' ? (holder[getter] as () => unknown)() : holder[name];
    if (indexed === null) {
      return read ?? null;
    }
    if (read instanceof Map) {
      return read.get(indexed[2]!) ?? null;
    }
    return null;
  }

  private declarationOf(path: string): { type: never; format?: never } {
    const property = this.metadata()?.properties[path.replace(/\[.*$/, '')];
    return (property ?? { type: { kind: 'string' } }) as never;
  }
}

/** `AbstractHtmlElementTag.autogenerateId()`: the name without its brackets. */
const idCounts = new Map<string, number>();

function autogenerateId(name: string): string {
  const base = name.replace(/[[\]]/g, '');
  const next = (idCounts.get(base) ?? 0) + 1;
  idCounts.set(base, next);
  return base + String(next);
}

/** Each rendered page counts its checkbox and radio ids from one again. */
export function resetTagIds(): void {
  idCounts.clear();
}

function attribute(name: string, value: string): string {
  return ' ' + name + '="' + htmlEscape(value) + '"';
}

/** `<form:form>`, whose attributes render in the order the tag writes them. */
export function formTag(options: {
  id: string;
  cssClass?: string;
  action: string;
  method: string;
  body: string;
  hiddenFields?: readonly [string, string][];
}): string {
  const open =
    '<form' +
    attribute('id', options.id) +
    (options.cssClass === undefined ? '' : attribute('class', options.cssClass)) +
    attribute('action', options.action) +
    attribute('method', options.method) +
    '>';
  const hidden = (options.hiddenFields ?? [])
    .map(([name, value]) => '<input type="hidden" name="' + name + '" value="' + value + '" />\n')
    .join('');
  // `RequestDataValueProcessor` contributes its fields in a div of their own,
  // written just before the form closes.
  const extra = hidden === '' ? '' : '<div>\n' + hidden + '</div>';
  return open + options.body + extra + '</form>';
}

export function label(path: string, body: string): string {
  return '<label' + attribute('for', path) + '>' + body + '</label>';
}

export function input(status: BindStatus, path: string): string {
  return (
    '<input' +
    attribute('id', path) +
    attribute('name', path) +
    attribute('type', 'text') +
    attribute('value', status.displayValue(path)) +
    '/>'
  );
}

export function textarea(status: BindStatus, path: string): string {
  return (
    '<textarea' +
    attribute('id', path) +
    attribute('name', path) +
    '>\n' +
    htmlEscape(status.displayValue(path)) +
    '</textarea>'
  );
}

/** `<form:errors>`, which renders nothing at all when the field is clean. */
export function errors(status: BindStatus, path: string, cssClass: string): string {
  const found = status.errors(path);
  if (found.length === 0) {
    return '';
  }
  return (
    '<span' +
    attribute('id', path + '.errors') +
    attribute('class', cssClass) +
    '>' +
    found.map((error) => htmlEscape(error.defaultMessage)).join('<br/>') +
    '</span>'
  );
}

export function select(path: string, body: string): string {
  return '<select' + attribute('id', path) + attribute('name', path) + '>' + body + '</select>';
}

export function option(status: BindStatus, path: string, value: string, body: string): string {
  const selected = status.displayValue(path) === value ? ' selected="selected"' : '';
  return '<option' + attribute('value', value) + selected + '>' + body + '</option>';
}

export function checkbox(status: BindStatus, path: string, value: string): string {
  const checked = String(status.value(path) ?? '') === value ? ' checked="checked"' : '';
  return (
    '<input' +
    attribute('id', autogenerateId(path)) +
    attribute('name', path) +
    attribute('type', 'checkbox') +
    attribute('value', value) +
    checked +
    '/>' +
    // The marker field is what tells the binder an unchecked box was submitted.
    '<input type="hidden"' +
    attribute('name', '_' + path) +
    attribute('value', 'on') +
    '/>'
  );
}

export function radiobutton(status: BindStatus, path: string, value: string): string {
  const checked = String(status.value(path) ?? '') === value ? ' checked="checked"' : '';
  return (
    '<input' +
    attribute('id', autogenerateId(path)) +
    attribute('name', path) +
    attribute('type', 'radio') +
    attribute('value', value) +
    checked +
    '/>'
  );
}
