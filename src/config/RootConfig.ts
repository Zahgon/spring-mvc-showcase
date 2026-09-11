/**
 * `RootConfig`: the shared resources visible to every web component. Only the
 * CSRF filter lives here — the showcase takes that one piece of Spring
 * Security rather than all of it.
 */

import { CsrfFilter, HttpSessionCsrfTokenRepository } from '../framework/web/CsrfFilter.js';

export function csrfFilter(): CsrfFilter {
  return new CsrfFilter(new HttpSessionCsrfTokenRepository());
}
