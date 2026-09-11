import { Bean, Constraints } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.views.JavaBean',
  properties: {
    foo: { type: Types.String, constraints: [Constraints.notNull()] },
    fruit: { type: Types.String, constraints: [Constraints.notNull()] },
  },
})
@JavaClass('org.springframework.samples.mvc.views.JavaBean')
export class JavaBean {
  private foo: string | null = null;

  private fruit: string | null = null;

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
}
