import { Bean } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.mapping.JavaBean',
  xmlRootElement: 'javaBean',
  properties: {
    foo: { type: Types.String },
    fruit: { type: Types.String },
  },
})
@JavaClass('org.springframework.samples.mvc.mapping.JavaBean')
export class JavaBean {
  private foo = 'bar';

  private fruit = 'apple';

  getFoo(): string {
    return this.foo;
  }

  setFoo(foo: string): void {
    this.foo = foo;
  }

  getFruit(): string {
    return this.fruit;
  }

  setFruit(fruit: string): void {
    this.fruit = fruit;
  }

  toString(): string {
    return 'JavaBean {foo=[' + this.foo + '], fruit=[' + this.fruit + ']}';
  }
}
