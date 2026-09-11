import { Controller } from '../../../framework/web/metadata.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.simple.SimpleController',
  restController: true,
  methods: [{ name: 'simple', mapping: { method: 'GET', path: '/simple' } }],
})
@JavaClass('org.springframework.samples.mvc.simple.SimpleController')
export class SimpleController {
  simple(): string {
    return 'Hello world!';
  }
}
