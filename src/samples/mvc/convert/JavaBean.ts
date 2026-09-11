import { Bean } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { JavaDate } from '../../../java/util/Date.js';
import { JavaClass, stringValueOf } from '../../../java/lang/Objects.js';
import { NestedBean } from './NestedBean.js';

@Bean({
  name: 'org.springframework.samples.mvc.convert.JavaBean',
  properties: {
    primitive: { type: Types.Integer },
    date: { type: Types.Date, format: { isoDate: true } },
    masked: { type: Types.String, format: { maskFormat: '(###) ###-####' } },
    // The list auto-grows as it is dereferenced, e.g. list[0]=value
    list: { type: Types.listOf({ type: Types.Integer }) },
    // The annotation's conversion rule applies to each list element
    formattedList: { type: Types.listOf({ type: Types.Date, format: { isoDate: true } }) },
    // The map auto-grows as it is dereferenced, e.g. map[key]=value
    map: { type: Types.mapOf(Types.Integer, { type: Types.String }) },
    // The nested bean is created when it is referenced, e.g. nested.foo=value
    nested: { type: Types.bean('NestedBean', () => new NestedBean()) },
  },
})
@JavaClass('org.springframework.samples.mvc.convert.JavaBean')
export class JavaBean {
  private primitive: number | null = null;

  private date: JavaDate | null = null;

  private masked: string | null = null;

  private list: number[] | null = null;

  private formattedList: JavaDate[] | null = null;

  private map: Map<number, string> | null = null;

  private nested: NestedBean | null = null;

  getPrimitive(): number | null {
    return this.primitive;
  }

  setPrimitive(primitive: number): void {
    this.primitive = primitive;
  }

  getDate(): JavaDate | null {
    return this.date;
  }

  setDate(date: JavaDate): void {
    this.date = date;
  }

  getMasked(): string | null {
    return this.masked;
  }

  setMasked(masked: string): void {
    this.masked = masked;
  }

  getList(): number[] | null {
    return this.list;
  }

  setList(list: number[]): void {
    this.list = list;
  }

  getFormattedList(): JavaDate[] | null {
    return this.formattedList;
  }

  setFormattedList(formattedList: JavaDate[]): void {
    this.formattedList = formattedList;
  }

  getMap(): Map<number, string> | null {
    return this.map;
  }

  setMap(map: Map<number, string>): void {
    this.map = map;
  }

  getNested(): NestedBean | null {
    return this.nested;
  }

  setNested(nested: NestedBean): void {
    this.nested = nested;
  }

  toString(): string {
    let sb = 'JavaBean';
    if (this.primitive !== null) {
      sb += ' primitive=' + String(this.primitive);
    }
    if (this.date !== null) {
      sb += ' date=' + String(this.date);
    }
    if (this.masked !== null) {
      sb += ' masked=' + this.masked;
    }
    if (this.list !== null) {
      sb += ' list=' + stringValueOf(this.list);
    }
    if (this.formattedList !== null) {
      sb += ' formattedList=' + stringValueOf(this.formattedList);
    }
    if (this.map !== null) {
      sb += ' map=' + stringValueOf(this.map);
    }
    if (this.nested !== null) {
      sb += ' nested=' + stringValueOf(this.nested);
    }
    return sb;
  }
}
