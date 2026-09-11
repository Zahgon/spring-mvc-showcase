/**
 * The rendered views.
 *
 * The JSPs are translated into TypeScript rather than interpreted, so a view is
 * a function of the model. The forward path stays the contract — a handler
 * still resolves to `/WEB-INF/views/views/html.jsp` and the suite still asserts
 * that path — and the registry maps that path to the template that renders it.
 */

import type { HttpServletRequest } from '../http/Servlet.js';

/** A view sees the model the handler built, keyed by attribute name. */
export type ViewModel = ReadonlyMap<string, unknown>;

export type ViewTemplate = (
  model: ViewModel,
  contextPath: string,
  request: HttpServletRequest,
) => string;
