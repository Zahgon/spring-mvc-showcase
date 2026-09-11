/**
 * `org.springframework.http.ResponseEntity`.
 *
 * Lets a handler set the status and the headers itself. Both are observable:
 * `/response/entity/status` answers 403, and `/response/entity/headers` sets
 * `Content-Type: text/plain` with no charset — the converter's default charset
 * is only appended when the handler has not set the header itself.
 */

import { HttpHeaders } from './HttpHeaders.js';

export class ResponseEntity<T> {
  readonly body: T;

  readonly headers: HttpHeaders;

  readonly status: number;

  constructor(body: T, headersOrStatus: HttpHeaders | number, status?: number) {
    this.body = body;
    if (typeof headersOrStatus === 'number') {
      this.headers = new HttpHeaders();
      this.status = headersOrStatus;
    } else {
      this.headers = headersOrStatus;
      this.status = status ?? 200;
    }
  }

  getBody(): T {
    return this.body;
  }

  getHeaders(): HttpHeaders {
    return this.headers;
  }

  getStatusCodeValue(): number {
    return this.status;
  }
}
