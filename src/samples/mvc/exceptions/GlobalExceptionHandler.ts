import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.exceptions.GlobalExceptionHandler',
  restController: true,
  controllerAdvice: true,
  methods: [
    {
      name: 'handleBusinessException',
      exceptionHandler: 'BusinessException',
      parameters: [{ kind: 'exception', type: Types.Any }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.exceptions.GlobalExceptionHandler')
export class GlobalExceptionHandler {
  handleBusinessException(_ex: Error): string {
    return 'Handled BusinessException';
  }
}
