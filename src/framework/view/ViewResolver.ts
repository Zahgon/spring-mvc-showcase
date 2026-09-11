/**
 * `InternalResourceViewResolver` and `RequestToViewNameTranslator`.
 *
 * `registry.jsp("/WEB-INF/views/", ".jsp")` means the view name `views/html`
 * forwards to `/WEB-INF/views/views/html.jsp`. A `void` handler takes its view
 * name from the request path instead, and a `redirect:` prefix sends a 302
 * rather than rendering.
 */

import { HttpHeaders } from '../http/HttpHeaders.js';
import type { HttpServletResponse } from '../http/Servlet.js';
import type { FormattingConversionService } from '../convert/ConversionService.js';
import type { RedirectAttributes } from '../ui/Model.js';

export const REDIRECT_URL_PREFIX = 'redirect:';

export class InternalResourceViewResolver {
  constructor(
    private readonly prefix: string,
    private readonly suffix: string,
  ) {}

  /** The forward path a view name resolves to. */
  resolve(viewName: string): string {
    return this.prefix + viewName + this.suffix;
  }
}

/**
 * `DefaultRequestToViewNameTranslator`: the lookup path without its leading
 * slash or its extension.
 */
export function viewNameFromPath(path: string): string {
  let name = path.startsWith('/') ? path.slice(1) : path;
  const lastSlash = name.lastIndexOf('/');
  const dot = name.indexOf('.', lastSlash + 1);
  if (dot >= 0) {
    name = name.slice(0, dot);
  }
  return name;
}

/**
 * Renders a resolved view. The forward is recorded rather than performed: the
 * JSPs are rendered by a servlet container, and what the suite asserts is the
 * forwarded URL.
 */
export function renderView(
  response: HttpServletResponse,
  forwardUrl: string,
  locale: string,
): void {
  response.setHeader(HttpHeaders.CONTENT_LANGUAGE, locale);
  response.forward(forwardUrl);
}

/**
 * `RedirectView`: the redirect attributes fill the URI template variables, and
 * whatever is left over is appended as query parameters and URL-encoded.
 *
 * The two redirect endpoints differ precisely here: the one that lets Spring
 * build the URL gets `date=12%2F31%2F11`, and the one that builds its own URL
 * with `UriComponentsBuilder` keeps `date=12/31/11`, because the value was
 * already in the string before the encoding step.
 */
export function expandRedirectUrl(
  url: string,
  redirectAttributes: RedirectAttributes | null,
  conversionService: FormattingConversionService,
): string {
  if (redirectAttributes === null) {
    return url;
  }
  const attributes = new Map(redirectAttributes.asMap());
  const expanded = url.replace(/\{([^}]+)\}/g, (_match, name: string) => {
    const value = attributes.get(name);
    attributes.delete(name);
    return encodeURIComponent(conversionService.print(value));
  });
  const query = [...attributes]
    .map(([name, value]) => encodeURIComponent(name) + '=' + encodeURIComponent(conversionService.print(value)))
    .join('&');
  if (query === '') {
    return expanded;
  }
  return expanded + (expanded.includes('?') ? '&' : '?') + query;
}
