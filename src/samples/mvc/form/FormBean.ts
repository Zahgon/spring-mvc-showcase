import { Bean, Constraints } from '../../../framework/bind/BeanMetadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { BigDecimal } from '../../../java/math/BigDecimal.js';
import type { JavaDate } from '../../../java/util/Date.js';
import { JavaClass, stringValueOf } from '../../../java/lang/Objects.js';
import { InquiryType, type InquiryTypeValue } from './InquiryType.js';

@Bean({
  name: 'org.springframework.samples.mvc.form.FormBean',
  properties: {
    name: { type: Types.String, constraints: [Constraints.notEmpty()] },
    age: { type: Types.Integer, primitive: true, constraints: [Constraints.min(21)] },
    birthDate: {
      type: Types.Date,
      format: { isoDate: true },
      constraints: [Constraints.past()],
    },
    phone: { type: Types.String, format: { maskFormat: '(###) ###-####' } },
    currency: { type: Types.BigDecimal, format: { numberPattern: '$###,###.00' } },
    percent: { type: Types.BigDecimal, format: { numberPercent: true } },
    inquiry: { type: Types.enumOf('org.springframework.samples.mvc.form.InquiryType', InquiryType) },
    inquiryDetails: { type: Types.String },
    subscribeNewsletter: { type: Types.Boolean, primitive: true },
    additionalInfo: { type: Types.mapOf(Types.String, { type: Types.String }) },
  },
})
@JavaClass('org.springframework.samples.mvc.form.FormBean')
export class FormBean {
  private name: string | null = null;

  /** A Java `int`, so it defaults to 0 rather than null. */
  private age = 0;

  private birthDate: JavaDate | null = null;

  private phone: string | null = null;

  private currency: BigDecimal | null = null;

  private percent: BigDecimal | null = null;

  private inquiry: InquiryTypeValue | null = null;

  private inquiryDetails: string | null = null;

  private subscribeNewsletter = false;

  private additionalInfo: Map<string, string> | null = null;

  getName(): string | null {
    return this.name;
  }

  setName(name: string): void {
    this.name = name;
  }

  getAge(): number {
    return this.age;
  }

  setAge(age: number): void {
    this.age = age;
  }

  getBirthDate(): JavaDate | null {
    return this.birthDate;
  }

  setBirthDate(birthDate: JavaDate): void {
    this.birthDate = birthDate;
  }

  getPhone(): string | null {
    return this.phone;
  }

  setPhone(phone: string): void {
    this.phone = phone;
  }

  getCurrency(): BigDecimal | null {
    return this.currency;
  }

  setCurrency(currency: BigDecimal): void {
    this.currency = currency;
  }

  getPercent(): BigDecimal | null {
    return this.percent;
  }

  setPercent(percent: BigDecimal): void {
    this.percent = percent;
  }

  getInquiry(): InquiryTypeValue | null {
    return this.inquiry;
  }

  setInquiry(inquiry: InquiryTypeValue): void {
    this.inquiry = inquiry;
  }

  getInquiryDetails(): string | null {
    return this.inquiryDetails;
  }

  setInquiryDetails(inquiryDetails: string): void {
    this.inquiryDetails = inquiryDetails;
  }

  isSubscribeNewsletter(): boolean {
    return this.subscribeNewsletter;
  }

  setSubscribeNewsletter(subscribeNewsletter: boolean): void {
    this.subscribeNewsletter = subscribeNewsletter;
  }

  getAdditionalInfo(): Map<string, string> | null {
    return this.additionalInfo;
  }

  setAdditionalInfo(additionalInfo: Map<string, string>): void {
    this.additionalInfo = additionalInfo;
  }

  toString(): string {
    let sb = 'properties name=';
    sb += this.name !== null ? "'" + this.name + "', " : 'null, ';
    sb += 'age=' + String(this.age) + ', ';
    sb += 'birthDate=' + stringValueOf(this.birthDate) + ', ';
    sb += 'phone=';
    sb += this.phone !== null ? "'" + this.phone + "', " : 'null, ';
    sb += 'currency=' + stringValueOf(this.currency) + ', ';
    sb += 'percent=' + stringValueOf(this.percent) + ', ';
    sb += 'inquiry=' + stringValueOf(this.inquiry) + ', ';
    sb += 'inquiryDetails=';
    sb += this.inquiryDetails !== null ? "'" + this.inquiryDetails + "', " : 'null, ';
    sb += 'subscribeNewsletter=' + String(this.subscribeNewsletter) + ', ';
    sb += 'additionalInfo=' + stringValueOf(this.additionalInfo);
    return sb;
  }
}
