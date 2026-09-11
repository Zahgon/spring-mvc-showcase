import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { MediaType } from '../../../framework/http/MediaType.js';
import type { HttpServletRequest } from '../../../framework/http/Servlet.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

/** What each mapping answers with, once, rather than inline at each return. */
const BY_PATH = 'Mapped by path!';
const BY_PATH_PATTERN = 'Mapped by path pattern (';
const BY_METHOD = 'Mapped by path + method';
const BY_PARAMETER = 'Mapped by path + method + presence of query parameter!';
const BY_PARAMETER_NEGATION = 'Mapped by path + method + not presence of query parameter!';
const BY_HEADER = 'Mapped by path + method + presence of header!';
const BY_HEADER_NEGATION = 'Mapped by path + method + absence of header!';
const BY_CONSUMES = 'Mapped by path + method + consumable media type (javaBean ';

@Controller({
  name: 'org.springframework.samples.mvc.mapping.MappingController',
  restController: true,
  methods: [
    { name: 'byPath', mapping: { method: 'GET', path: '/mapping/path' } },
    {
      name: 'byPathPattern',
      mapping: { method: 'GET', path: '/mapping/path/*' },
      parameters: [{ kind: 'request', type: Types.Any }],
    },
    { name: 'byMethod', mapping: { method: 'GET', path: '/mapping/method' } },
    { name: 'byParameter', mapping: { method: 'GET', path: '/mapping/parameter', params: ['foo'] } },
    {
      name: 'byParameterNegation',
      mapping: { method: 'GET', path: '/mapping/parameter', params: ['!foo'] },
    },
    {
      name: 'byHeader',
      mapping: { method: 'GET', path: '/mapping/header', headers: ['FooHeader=foo'] },
    },
    {
      name: 'byHeaderNegation',
      mapping: { method: 'GET', path: '/mapping/header', headers: ['!FooHeader'] },
    },
    {
      name: 'byConsumes',
      mapping: {
        method: 'POST',
        path: '/mapping/consumes',
        consumes: [MediaType.APPLICATION_JSON_VALUE],
      },
      parameters: [
        { kind: 'requestBody', type: Types.bean('JavaBean', () => new JavaBean()) },
      ],
    },
    {
      name: 'byProducesJson',
      mapping: {
        method: 'GET',
        path: '/mapping/produces',
        produces: [MediaType.APPLICATION_JSON_VALUE],
      },
    },
    {
      name: 'byProducesXml',
      mapping: {
        method: 'GET',
        path: '/mapping/produces',
        produces: [MediaType.APPLICATION_XML_VALUE],
      },
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.mapping.MappingController')
export class MappingController {
  byPath(): string {
    return BY_PATH;
  }

  byPathPattern(request: HttpServletRequest): string {
    return BY_PATH_PATTERN + "'" + request.getRequestURI() + "')";
  }

  byMethod(): string {
    return BY_METHOD;
  }

  byParameter(): string {
    return BY_PARAMETER;
  }

  byParameterNegation(): string {
    return BY_PARAMETER_NEGATION;
  }

  byHeader(): string {
    return BY_HEADER;
  }

  byHeaderNegation(): string {
    return BY_HEADER_NEGATION;
  }

  byConsumes(javaBean: JavaBean): string {
    return BY_CONSUMES + "'" + String(javaBean) + "')";
  }

  byProducesJson(): JavaBean {
    return new JavaBean();
  }

  byProducesXml(): JavaBean {
    return new JavaBean();
  }
}
