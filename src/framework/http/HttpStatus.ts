/** The `org.springframework.http.HttpStatus` constants the showcase uses. */
export const HttpStatus = {
  OK: 200,
  MOVED_TEMPORARILY: 302,
  FOUND: 302,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const REASON_PHRASES: Readonly<Record<number, string>> = {
  200: 'OK',
  302: 'Found',
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  415: 'Unsupported Media Type',
  500: 'Internal Server Error',
};
