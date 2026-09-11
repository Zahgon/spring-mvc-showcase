import { JavaClass } from '../../../java/lang/Objects.js';

@JavaClass('org.springframework.samples.mvc.convert.SocialSecurityNumber')
export class SocialSecurityNumber {
  constructor(private readonly value: string) {}

  getValue(): string {
    return this.value;
  }

  static valueOf(value: string): SocialSecurityNumber {
    return new SocialSecurityNumber(value);
  }
}
