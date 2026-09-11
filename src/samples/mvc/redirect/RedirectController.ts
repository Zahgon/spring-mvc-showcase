import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { FormattingConversionService } from '../../../framework/convert/ConversionService.js';
import type { RedirectAttributes } from '../../../framework/ui/Model.js';
import { LocalDate } from '../../../java/time/LocalDate.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.redirect.RedirectController',
  mapping: { path: '/redirect' },
  methods: [
    {
      name: 'uriTemplate',
      mapping: { method: 'GET', path: '/uriTemplate' },
      parameters: [{ kind: 'redirectAttributes', type: Types.Any }],
    },
    { name: 'uriComponentsBuilder', mapping: { method: 'GET', path: '/uriComponentsBuilder' } },
    {
      name: 'show',
      mapping: { method: 'GET', path: '/{account}' },
      parameters: [
        { kind: 'pathVariable', name: 'account', type: Types.String },
        { kind: 'requestParam', name: 'date', type: Types.LocalDate, required: false },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.redirect.RedirectController')
export class RedirectController {
  constructor(private readonly conversionService: FormattingConversionService) {}

  uriTemplate(redirectAttrs: RedirectAttributes): string {
    redirectAttrs.addAttribute('account', 'a123'); // Used as a URI template variable
    redirectAttrs.addAttribute('date', new LocalDate(2011, 12, 31)); // Appended as a query parameter
    return 'redirect:/redirect/{account}';
  }

  uriComponentsBuilder(): string {
    const date = this.conversionService.print(new LocalDate(2011, 12, 31));
    // UriComponentsBuilder.fromPath("/redirect/{account}").queryParam("date", date)
    //   .build().expand("a123").encode()
    const redirectUri = '/redirect/a123?date=' + date;
    return 'redirect:' + redirectUri;
  }

  show(_account: string, _date: LocalDate | null): string {
    return 'redirect/redirectResults';
  }
}
