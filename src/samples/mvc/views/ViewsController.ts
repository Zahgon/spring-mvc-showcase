import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { Model } from '../../../framework/ui/Model.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

@Controller({
  name: 'org.springframework.samples.mvc.views.ViewsController',
  mapping: { path: '/views/*' },
  methods: [
    {
      name: 'prepare',
      mapping: { method: 'GET', path: 'html' },
      parameters: [{ kind: 'model', type: Types.Any }],
    },
    {
      name: 'usingRequestToViewNameTranslator',
      mapping: { method: 'GET', path: '/viewName' },
      parameters: [{ kind: 'model', type: Types.Any }],
    },
    {
      name: 'pathVars',
      mapping: { method: 'GET', path: 'pathVariables/{foo}/{fruit}' },
      parameters: [
        { kind: 'pathVariable', name: 'foo', type: Types.String },
        { kind: 'pathVariable', name: 'fruit', type: Types.String },
      ],
    },
    {
      name: 'dataBinding',
      mapping: { method: 'GET', path: 'dataBinding/{foo}/{fruit}' },
      parameters: [
        {
          // `@Valid JavaBean javaBean` -- no name, so it is derived.
          kind: 'modelAttribute',
          type: Types.bean('org.springframework.samples.mvc.views.JavaBean', () => new JavaBean()),
          valid: true,
        },
        { kind: 'model', type: Types.Any },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.views.ViewsController')
export class ViewsController {
  prepare(model: Model): string {
    model.addAttribute('foo', 'bar');
    model.addAttribute('fruit', 'apple');
    return 'views/html';
  }

  usingRequestToViewNameTranslator(model: Model): void {
    model.addAttribute('foo', 'bar');
    model.addAttribute('fruit', 'apple');
  }

  pathVars(_foo: string, _fruit: string): string {
    // No need to add the "foo" and "fruit" path variables to the model;
    // they are merged into it before rendering.
    return 'views/html';
  }

  dataBinding(_javaBean: JavaBean, _model: Model): string {
    // The JavaBean "foo" and "fruit" properties are populated from URI variables
    return 'views/dataBinding';
  }
}
