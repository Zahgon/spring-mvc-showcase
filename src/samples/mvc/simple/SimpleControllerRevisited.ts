import { Controller } from '../../../framework/web/metadata.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.simple.SimpleControllerRevisited',
  restController: true,
  methods: [
    {
      name: 'simple',
      mapping: { method: 'GET', path: '/simple/revisited', headers: ['Accept=text/plain'] },
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.simple.SimpleControllerRevisited')
export class SimpleControllerRevisited {
  simple(): string {
    return 'Hello world revisited!';
  }
}
