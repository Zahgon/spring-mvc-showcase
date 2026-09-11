import { Bean } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.data.JavaBean',
  properties: {
    param1: { type: Types.String },
    param2: { type: Types.String },
    param3: { type: Types.String },
  },
})
@JavaClass('org.springframework.samples.mvc.data.JavaBean')
export class JavaBean {
  private param1: string | null = null;

  private param2: string | null = null;

  private param3: string | null = null;

  getParam1(): string | null {
    return this.param1;
  }

  setParam1(param1: string): void {
    this.param1 = param1;
  }

  getParam2(): string | null {
    return this.param2;
  }

  setParam2(param2: string): void {
    this.param2 = param2;
  }

  getParam3(): string | null {
    return this.param3;
  }

  setParam3(param3: string): void {
    this.param3 = param3;
  }
}
