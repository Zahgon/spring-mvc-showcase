/**
 * The view registry: the forward path a handler resolves to, and the template
 * that renders it.
 *
 * The paths are the ones `InternalResourceViewResolver` produces, so what the
 * suite asserts as `forwardedUrl` is the same string that selects a template
 * here.
 */

import type { ViewContext } from '../../framework/web/ServletContainer.js';
import * as home from './home.js';
import * as form from './form.js';
import * as fileupload from './fileupload.js';
import * as html from './views/html.js';
import * as viewName from './views/viewName.js';
import * as dataBinding from './views/dataBinding.js';
import * as redirectResults from './redirect/redirectResults.js';

export const VIEWS: ReadonlyMap<string, (context: ViewContext) => string> = new Map([
  ['/WEB-INF/views/home.jsp', (c: ViewContext) => home.render(c.model, c.contextPath)],
  [
    '/WEB-INF/views/form.jsp',
    (c: ViewContext) => form.render(c.model, c.contextPath, c.conversionService, c.request),
  ],
  ['/WEB-INF/views/fileupload.jsp', (c: ViewContext) => fileupload.render(c.model, c.contextPath)],
  ['/WEB-INF/views/views/html.jsp', (c: ViewContext) => html.render(c.model, c.contextPath)],
  [
    '/WEB-INF/views/views/viewName.jsp',
    (c: ViewContext) => viewName.render(c.model, c.contextPath),
  ],
  [
    '/WEB-INF/views/views/dataBinding.jsp',
    (c: ViewContext) => dataBinding.render(c.model, c.contextPath),
  ],
  [
    '/WEB-INF/views/redirect/redirectResults.jsp',
    (c: ViewContext) => redirectResults.render(c.model, c.contextPath, c.request),
  ],
]);
