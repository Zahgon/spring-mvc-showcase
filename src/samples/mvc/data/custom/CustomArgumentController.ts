import { Controller } from '../../../../framework/web/metadata.js';
import { Types } from '../../../../framework/convert/TypeDescriptor.js';
import type { HttpServletRequest } from '../../../../framework/http/Servlet.js';
import { JavaClass } from '../../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.data.custom.CustomArgumentController',
  restController: true,
  methods: [
    {
      name: 'beforeInvokingHandlerMethod',
      modelAttribute: true,
      parameters: [{ kind: 'request', type: Types.Any }],
    },
    {
      name: 'custom',
      mapping: { method: 'GET', path: '/data/custom' },
      // Resolved by the application's own CustomArgumentResolver, selected by
      // its `@RequestAttribute` annotation.
      parameters: [{ kind: 'requestAttribute', name: 'foo', type: Types.String }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.data.custom.CustomArgumentController')
export class CustomArgumentController {
  beforeInvokingHandlerMethod(request: HttpServletRequest): void {
    request.setAttribute('foo', 'bar');
  }

  custom(foo: string): string {
    return "Got 'foo' request attribute value '" + foo + "'";
  }
}
