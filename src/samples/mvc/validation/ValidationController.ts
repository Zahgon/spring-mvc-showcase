import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { BindingResult } from '../../../framework/bind/BindingResult.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

@Controller({
  name: 'org.springframework.samples.mvc.validation.ValidationController',
  restController: true,
  methods: [
    {
      name: 'validate',
      mapping: { method: 'GET', path: '/validate' },
      parameters: [
        {
          // `@Valid JavaBean javaBean` -- no name, so it is derived.
          kind: 'modelAttribute',
          type: Types.bean(
            'org.springframework.samples.mvc.validation.JavaBean',
            () => new JavaBean(),
          ),
          valid: true,
        },
        { kind: 'bindingResult', type: Types.Any },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.validation.ValidationController')
export class ValidationController {
  // enforcement of the constraints on the JavaBean argument requires a
  // JSR-303 provider

  validate(_bean: JavaBean, result: BindingResult): string {
    if (result.hasErrors()) {
      return 'Object has validation errors';
    } else {
      return 'No errors';
    }
  }
}
