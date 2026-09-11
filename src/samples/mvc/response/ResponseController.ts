import { Controller } from '../../../framework/web/metadata.js';
import { HttpHeaders } from '../../../framework/http/HttpHeaders.js';
import { MediaType } from '../../../framework/http/MediaType.js';
import { ResponseEntity } from '../../../framework/http/ResponseEntity.js';
import { HttpStatus } from '../../../framework/http/HttpStatus.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.response.ResponseController',
  restController: true,
  mapping: { path: '/response', method: 'GET' },
  methods: [
    { name: 'responseBody', mapping: { method: 'GET', path: '/annotation' } },
    { name: 'responseAcceptHeaderCharset', mapping: { method: 'GET', path: '/charset/accept' } },
    {
      name: 'responseProducesConditionCharset',
      mapping: { method: 'GET', path: '/charset/produce', produces: ['text/plain;charset=UTF-8'] },
    },
    { name: 'responseEntityStatusCode', mapping: { method: 'GET', path: '/entity/status' } },
    { name: 'responseEntityCustomHeaders', mapping: { method: 'GET', path: '/entity/headers' } },
  ],
})
@JavaClass('org.springframework.samples.mvc.response.ResponseController')
export class ResponseController {
  responseBody(): string {
    return 'The String ResponseBody';
  }

  responseAcceptHeaderCharset(): string {
    return '\u3053\u3093\u306b\u3061\u306f\u4e16\u754c\uff01 ("Hello world!" in Japanese)';
  }

  responseProducesConditionCharset(): string {
    return '\u3053\u3093\u306b\u3061\u306f\u4e16\u754c\uff01 ("Hello world!" in Japanese)';
  }

  responseEntityStatusCode(): ResponseEntity<string> {
    return new ResponseEntity<string>(
      'The String ResponseBody with custom status code (403 Forbidden)',
      HttpStatus.FORBIDDEN,
    );
  }

  responseEntityCustomHeaders(): ResponseEntity<string> {
    const headers = new HttpHeaders();
    headers.setContentType(MediaType.TEXT_PLAIN);
    return new ResponseEntity<string>(
      'The String ResponseBody with custom header Content-Type=text/plain',
      headers,
      HttpStatus.OK,
    );
  }
}
