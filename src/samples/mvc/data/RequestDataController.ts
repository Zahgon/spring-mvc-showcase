import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { HttpEntity } from '../../../framework/method/ArgumentResolver.js';
import { JavaClass, stringValueOf } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

@Controller({
  name: 'org.springframework.samples.mvc.data.RequestDataController',
  restController: true,
  mapping: { path: '/data' },
  methods: [
    {
      name: 'withParam',
      mapping: { method: 'GET', path: 'param' },
      parameters: [{ kind: 'requestParam', name: 'foo', type: Types.String }],
    },
    {
      name: 'withParamGroup',
      mapping: { method: 'GET', path: 'group' },
      parameters: [
        {
          kind: 'modelAttribute',
          name: 'javaBean',
          type: Types.bean('org.springframework.samples.mvc.data.JavaBean', () => new JavaBean()),
        },
      ],
    },
    {
      name: 'withPathVariable',
      mapping: { method: 'GET', path: 'path/{var}' },
      parameters: [{ kind: 'pathVariable', name: 'var', type: Types.String }],
    },
    {
      name: 'withMatrixVariable',
      mapping: { method: 'GET', path: '{path}/simple' },
      parameters: [
        { kind: 'pathVariable', name: 'path', type: Types.String },
        { kind: 'matrixVariable', name: 'foo', type: Types.String },
      ],
    },
    {
      name: 'withMatrixVariablesMultiple',
      mapping: { method: 'GET', path: '{path1}/{path2}' },
      parameters: [
        { kind: 'pathVariable', name: 'path1', type: Types.String },
        { kind: 'matrixVariable', name: 'foo', pathVar: 'path1', type: Types.String },
        { kind: 'pathVariable', name: 'path2', type: Types.String },
        { kind: 'matrixVariable', name: 'foo', pathVar: 'path2', type: Types.String },
      ],
    },
    {
      name: 'withHeader',
      mapping: { method: 'GET', path: 'header' },
      parameters: [{ kind: 'requestHeader', name: 'Accept', type: Types.String }],
    },
    {
      name: 'withCookie',
      mapping: { method: 'GET', path: 'cookie' },
      parameters: [{ kind: 'cookieValue', name: 'openid_provider', type: Types.String }],
    },
    {
      name: 'withBody',
      mapping: { method: 'POST', path: 'body' },
      parameters: [{ kind: 'requestBody', type: Types.String }],
    },
    {
      name: 'withEntity',
      mapping: { method: 'POST', path: 'entity' },
      parameters: [{ kind: 'httpEntity', type: Types.String }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.data.RequestDataController')
export class RequestDataController {
  withParam(foo: string): string {
    return "Obtained 'foo' query parameter value '" + foo + "'";
  }

  withParamGroup(bean: JavaBean): string {
    return 'Obtained parameter group ' + stringValueOf(bean);
  }

  withPathVariable(pathVar: string): string {
    return "Obtained 'var' path variable value '" + pathVar + "'";
  }

  withMatrixVariable(path: string, foo: string): string {
    return "Obtained matrix variable 'foo=" + foo + "' from path segment '" + path + "'";
  }

  withMatrixVariablesMultiple(path1: string, foo1: string, path2: string, foo2: string): string {
    return (
      'Obtained matrix variable foo=' +
      foo1 +
      " from path segment '" +
      path1 +
      "' and variable 'foo=" +
      foo2 +
      " from path segment '" +
      path2 +
      "'"
    );
  }

  withHeader(accept: string): string {
    return "Obtained 'Accept' header '" + accept + "'";
  }

  withCookie(openidProvider: string): string {
    return "Obtained 'openid_provider' cookie '" + openidProvider + "'";
  }

  withBody(body: string): string {
    return "Posted request body '" + body + "'";
  }

  withEntity(entity: HttpEntity<string>): string {
    return (
      "Posted request body '" + entity.getBody() + "'; headers = " + String(entity.getHeaders())
    );
  }
}
