import { Bean } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { JavaClass, stringValueOf } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.convert.NestedBean',
  properties: {
    foo: { type: Types.String },
    list: { type: Types.listOf({ type: Types.bean('NestedBean', () => new NestedBean()) }) },
    map: {
      type: Types.mapOf(Types.String, { type: Types.bean('NestedBean', () => new NestedBean()) }),
    },
  },
})
@JavaClass('org.springframework.samples.mvc.convert.NestedBean')
export class NestedBean {
  private foo: string | null = null;

  private list: NestedBean[] | null = null;

  private map: Map<string, NestedBean> | null = null;

  getFoo(): string | null {
    return this.foo;
  }

  setFoo(foo: string): void {
    this.foo = foo;
  }

  getList(): NestedBean[] | null {
    return this.list;
  }

  setList(list: NestedBean[]): void {
    this.list = list;
  }

  getMap(): Map<string, NestedBean> | null {
    return this.map;
  }

  setMap(map: Map<string, NestedBean>): void {
    this.map = map;
  }

  toString(): string {
    let sb = 'NestedBean';
    if (this.foo !== null) {
      sb += ' foo=' + this.foo;
    }
    if (this.list !== null) {
      sb += ' list=' + stringValueOf(this.list);
    }
    if (this.map !== null) {
      sb += ' map=' + stringValueOf(this.map);
    }
    return sb;
  }
}
