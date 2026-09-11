import { Bean, Constraints } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.messageconverters.JavaBean',
  xmlRootElement: 'javaBean',
  properties: {
    foo: { type: Types.String, constraints: [Constraints.notNull()] },
    fruit: { type: Types.String, constraints: [Constraints.notNull()] },
  },
})
@JavaClass('org.springframework.samples.mvc.messageconverters.JavaBean')
export class JavaBean {
  private foo: string | null = null;

  private fruit: string | null = null;

  constructor(foo?: string, fruit?: string) {
    this.foo = foo ?? null;
    this.fruit = fruit ?? null;
  }

  getFoo(): string | null {
    return this.foo;
  }

  setFoo(foo: string): void {
    this.foo = foo;
  }

  getFruit(): string | null {
    return this.fruit;
  }

  setFruit(fruit: string): void {
    this.fruit = fruit;
  }

  toString(): string {
    return 'JavaBean {foo=[' + String(this.foo) + '], fruit=[' + String(this.fruit) + ']}';
  }
}
