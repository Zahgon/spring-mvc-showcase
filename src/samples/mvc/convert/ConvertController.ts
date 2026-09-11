import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { JavaDate } from '../../../java/util/Date.js';
import { JavaClass, stringValueOf } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';
import { SocialSecurityNumber } from './SocialSecurityNumber.js';

@Controller({
  name: 'org.springframework.samples.mvc.convert.ConvertController',
  restController: true,
  mapping: { path: '/convert' },
  methods: [
    {
      name: 'primitive',
      mapping: { method: 'GET', path: 'primitive' },
      parameters: [{ kind: 'requestParam', name: 'value', type: Types.Integer }],
    },
    {
      name: 'date',
      mapping: { method: 'GET', path: 'date/{value}' },
      parameters: [
        { kind: 'pathVariable', name: 'value', type: Types.Date, format: { isoDate: true } },
      ],
    },
    {
      name: 'collection',
      mapping: { method: 'GET', path: 'collection' },
      parameters: [
        {
          kind: 'requestParam',
          name: 'values',
          type: Types.listOf({ type: Types.Integer }),
        },
      ],
    },
    {
      name: 'formattedCollection',
      mapping: { method: 'GET', path: 'formattedCollection' },
      parameters: [
        {
          kind: 'requestParam',
          name: 'values',
          type: Types.listOf({ type: Types.Date, format: { isoDate: true } }),
        },
      ],
    },
    {
      name: 'bean',
      mapping: { method: 'GET', path: 'bean' },
      parameters: [
        {
          kind: 'modelAttribute',
          name: 'javaBean',
          type: Types.bean('org.springframework.samples.mvc.convert.JavaBean', () => new JavaBean()),
        },
      ],
    },
    {
      name: 'valueObject',
      mapping: { method: 'GET', path: 'value' },
      parameters: [
        {
          kind: 'requestParam',
          name: 'value',
          type: Types.valueObject(
            'org.springframework.samples.mvc.convert.SocialSecurityNumber',
            (text) => SocialSecurityNumber.valueOf(text),
          ),
        },
      ],
    },
    {
      name: 'customConverter',
      mapping: { method: 'GET', path: 'custom' },
      parameters: [
        {
          kind: 'requestParam',
          name: 'value',
          type: Types.String,
          format: { maskFormat: '###-##-####' },
        },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.convert.ConvertController')
export class ConvertController {
  primitive(value: number): string {
    return 'Converted primitive ' + String(value);
  }

  // requires the date formatter on the conversion service
  date(value: JavaDate): string {
    return 'Converted date ' + String(value);
  }

  collection(values: number[]): string {
    return 'Converted collection ' + stringValueOf(values);
  }

  formattedCollection(values: JavaDate[]): string {
    return 'Converted formatted collection ' + stringValueOf(values);
  }

  bean(bean: JavaBean): string {
    return 'Converted ' + String(bean);
  }

  valueObject(value: SocialSecurityNumber): string {
    return 'Converted value object ' + stringValueOf(value);
  }

  customConverter(value: string): string {
    return "Converted '" + value + "' with a custom converter";
  }
}
