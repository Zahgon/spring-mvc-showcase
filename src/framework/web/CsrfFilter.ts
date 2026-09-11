/**
 * `org.springframework.security.web.csrf.CsrfFilter` with an
 * `HttpSessionCsrfTokenRepository`, which is all of Spring Security the
 * showcase pulls in.
 *
 * The filter puts the token on the request under `_csrf` — the name the JSPs
 * read it by — and rejects any unsafe method that does not carry it back.
 */

import { randomUUID } from 'node:crypto';
import type { HttpServletRequest, HttpServletResponse } from '../http/Servlet.js';

const SESSION_ATTRIBUTE = 'org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository.CSRF_TOKEN';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'TRACE', 'OPTIONS']);

export class CsrfToken {
  constructor(
    private readonly headerName: string,
    private readonly parameterName: string,
    private readonly token: string,
  ) {}

  getHeaderName(): string {
    return this.headerName;
  }

  getParameterName(): string {
    return this.parameterName;
  }

  getToken(): string {
    return this.token;
  }
}

export class HttpSessionCsrfTokenRepository {
  generateToken(): CsrfToken {
    return new CsrfToken('X-CSRF-TOKEN', '_csrf', randomUUID());
  }

  loadToken(request: HttpServletRequest): CsrfToken | null {
    return (request.getSession(false)?.getAttribute(SESSION_ATTRIBUTE) as CsrfToken | null) ?? null;
  }

  saveToken(token: CsrfToken, request: HttpServletRequest): void {
    request.getSession(true)!.setAttribute(SESSION_ATTRIBUTE, token);
  }
}

export class CsrfFilter {
  constructor(private readonly repository = new HttpSessionCsrfTokenRepository()) {}

  /** Returns false when the request was rejected and the chain must stop. */
  doFilter(request: HttpServletRequest, response: HttpServletResponse): boolean {
    let token = this.repository.loadToken(request);
    if (token === null) {
      token = this.repository.generateToken();
      this.repository.saveToken(token, request);
    }
    request.setAttribute(token.getParameterName(), token);
    request.setAttribute('_csrf', token);
    if (SAFE_METHODS.has(request.getMethod())) {
      return true;
    }
    const actual =
      request.getHeader(token.getHeaderName()) ?? request.getParameter(token.getParameterName());
    if (actual === token.getToken()) {
      return true;
    }
    response.sendError(403);
    return false;
  }
}
