import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { MediaType } from '../../../framework/http/MediaType.js';
import type { HttpServletRequest } from '../../../framework/http/Servlet.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

/**
 * The same answers as {@link MappingController}, with two of the strings
 * shortened -- `not presence of query!` and `absence of header!` -- exactly as
 * the original words them.
 */
const BY_PATH = 'Mapped by path!';
const BY_PATH_PATTERN = 'Mapped by path pattern (';
const BY_METHOD = 'Mapped by path + method';
const BY_PARAMETER = 'Mapped by path + method + presence of query parameter!';
const BY_PARAMETER_NEGATION = 'Mapped by path + method + not presence of query!';
const BY_HEADER = 'Mapped by path + method + presence of header!';
const BY_HEADER_NEGATION = 'Mapped by path + method + absence of header!';
const BY_CONSUMES = 'Mapped by path + method + consumable media type (javaBean ';

/**
 * The same nine mappings as {@link MappingController}, declared relative to a
 * class-level `/class-mapping/*`. The trailing wildcard is not a path segment
 * of its own: Spring combines `/class-mapping/*` with `/path` into
 * `/class-mapping/path`, so the method pattern takes the wildcard's place.
 */
@Controller({
  name: 'org.springframework.samples.mvc.mapping.ClasslevelMappingController',
  restController: true,
  mapping: { path: '/class-mapping/*' },
  methods: [
    { name: 'byPath', mapping: { method: 'GET', path: '/path' } },
    {
      name: 'byPathPattern',
      mapping: { method: 'GET', path: '/path/*' },
      parameters: [{ kind: 'request', type: Types.Any }],
    },
    { name: 'byMethod', mapping: { method: 'GET', path: '/method' } },
    { name: 'byParameter', mapping: { method: 'GET', path: '/parameter', params: ['foo'] } },
    {
      name: 'byParameterNegation',
      mapping: { method: 'GET', path: '/parameter', params: ['!foo'] },
    },
    {
      name: 'byHeader',
      mapping: { method: 'GET', path: '/header', headers: ['FooHeader=foo'] },
    },
    {
      name: 'byHeaderNegation',
      mapping: { method: 'GET', path: '/notheader', headers: ['!FooHeader'] },
    },
    {
      name: 'byConsumes',
      mapping: {
        method: 'POST',
        path: '/consumes',
        consumes: [MediaType.APPLICATION_JSON_VALUE],
      },
      parameters: [{ kind: 'requestBody', type: Types.bean('JavaBean', () => new JavaBean()) }],
    },
    {
      name: 'byProduces',
      mapping: {
        method: 'GET',
        path: '/produces',
        produces: [MediaType.APPLICATION_JSON_VALUE],
      },
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.mapping.ClasslevelMappingController')
export class ClasslevelMappingController {
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
    return BY_CONSUMES + "'" + javaBean + "')";
  }

  byProduces(): JavaBean {
    return new JavaBean();
  }
}
