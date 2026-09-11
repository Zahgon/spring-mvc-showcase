import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { IllegalStateException } from '../../../framework/web/exceptions.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { BusinessException } from './BusinessException.js';

@Controller({
  name: 'org.springframework.samples.mvc.exceptions.ExceptionController',
  restController: true,
  methods: [
    { name: 'exception', mapping: { method: 'GET', path: '/exception' } },
    { name: 'businessException', mapping: { method: 'GET', path: '/global-exception' } },
    {
      name: 'handle',
      exceptionHandler: 'IllegalStateException',
      parameters: [{ kind: 'exception', type: Types.Any }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.exceptions.ExceptionController')
export class ExceptionController {
  exception(): string {
    throw new IllegalStateException('Sorry!');
  }

  businessException(): string {
    throw new BusinessException();
  }

  handle(_e: Error): string {
    return 'IllegalStateException handled!';
  }
}
