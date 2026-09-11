import { Bean, Constraints } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { JavaDate } from '../../../java/util/Date.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Bean({
  name: 'org.springframework.samples.mvc.validation.JavaBean',
  properties: {
    number: { type: Types.Integer, constraints: [Constraints.notNull(), Constraints.max(5)] },
    date: {
      type: Types.Date,
      format: { isoDate: true },
      constraints: [Constraints.notNull(), Constraints.future()],
    },
  },
})
@JavaClass('org.springframework.samples.mvc.validation.JavaBean')
export class JavaBean {
  private number: number | null = null;

  private date: JavaDate | null = null;

  getNumber(): number | null {
    return this.number;
  }

  setNumber(value: number): void {
    this.number = value;
  }

  getDate(): JavaDate | null {
    return this.date;
  }

  setDate(date: JavaDate): void {
    this.date = date;
  }
}
