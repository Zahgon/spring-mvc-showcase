import { Controller } from '../../../../framework/web/metadata.js';
import { Types } from '../../../../framework/convert/TypeDescriptor.js';
import type { HttpServletRequest, HttpServletResponse } from '../../../../framework/http/Servlet.js';
import { JavaClass, stringValueOf } from '../../../../java/lang/Objects.js';

/** The original builds this answer with a `StringBuilder`; the label is its own. */
const SESSION_LABEL = 'session=';

@Controller({
  name: 'org.springframework.samples.mvc.data.standard.StandardArgumentsController',
  restController: true,
  methods: [
    {
      name: 'standardRequestArgs',
      mapping: { method: 'GET', path: '/data/standard/request' },
      parameters: [
        { kind: 'request', type: Types.Any },
        { kind: 'principal', type: Types.Any },
        { kind: 'locale', type: Types.Any },
      ],
    },
    {
      name: 'requestReader',
      mapping: { method: 'POST', path: '/data/standard/request/reader' },
      parameters: [{ kind: 'reader', type: Types.String }],
    },
    {
      name: 'requestInputStream',
      mapping: { method: 'POST', path: '/data/standard/request/is' },
      parameters: [{ kind: 'inputStream', type: Types.Any }],
    },
    {
      name: 'response',
      mapping: { method: 'GET', path: '/data/standard/response' },
      parameters: [{ kind: 'response', type: Types.Any }],
    },
    {
      name: 'responseWriter',
      mapping: { method: 'GET', path: '/data/standard/response/writer' },
      parameters: [{ kind: 'writer', type: Types.Any }],
    },
    {
      name: 'responseOutputStream',
      mapping: { method: 'GET', path: '/data/standard/response/os' },
      parameters: [{ kind: 'outputStream', type: Types.Any }],
    },
    {
      name: 'session',
      mapping: { method: 'GET', path: '/data/standard/session' },
      parameters: [{ kind: 'session', type: Types.Any }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.data.standard.StandardArgumentsController')
export class StandardArgumentsController {
  // request related

  standardRequestArgs(request: HttpServletRequest, user: unknown, locale: string): string {
    let buffer = '';
    buffer += 'request = ' + stringValueOf(request) + ', ';
    buffer += 'userPrincipal = ' + stringValueOf(user) + ', ';
    buffer += 'requestLocale = ' + locale;
    return buffer;
  }

  requestReader(requestBodyReader: string): string {
    return 'Read char request body = ' + requestBodyReader;
  }

  // Java overloads both of these on their parameter type; TypeScript has no
  // overloading by type at run time, so the second of each pair is renamed.
  // The method names are not observable over HTTP.
  requestInputStream(requestBodyIs: Buffer): string {
    return 'Read binary request body = ' + requestBodyIs.toString('utf8');
  }

  // response related

  response(response: HttpServletResponse): string {
    return 'response = ' + stringValueOf(response);
  }

  responseWriter(responseWriter: HttpServletResponse): void {
    responseWriter.writeText('Wrote char response using Writer');
  }

  responseOutputStream(os: HttpServletResponse): void {
    os.write(Buffer.from('Wrote binary response using OutputStream', 'utf8'));
  }

  // HttpSession

  session(session: object): string {
    return SESSION_LABEL + stringValueOf(session);
  }
}
