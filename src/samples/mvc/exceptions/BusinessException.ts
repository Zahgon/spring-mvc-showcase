import { JavaException } from '../../../framework/web/exceptions.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@JavaClass('org.springframework.samples.mvc.exceptions.BusinessException')
export class BusinessException extends JavaException {}
