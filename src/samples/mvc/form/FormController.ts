import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { BindingResult } from '../../../framework/bind/BindingResult.js';
import type { Model, RedirectAttributes } from '../../../framework/ui/Model.js';
import type { HttpServletRequest } from '../../../framework/http/Servlet.js';
import { AjaxUtils } from '../../../mvc/extensions/ajax/AjaxUtils.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { FormBean } from './FormBean.js';

/**
 * The one place a `FormBean` is built. `createFormBean` supplies it on every
 * request, and the `@ModelAttribute` parameter falls back to the same factory
 * rather than to a second copy of `new FormBean()`.
 */
const newFormBean = (): FormBean => new FormBean();

@Controller({
  name: 'org.springframework.samples.mvc.form.FormController',
  mapping: { path: '/form' },
  sessionAttributes: ['formBean'],
  methods: [
    // Invoked on every request
    {
      name: 'ajaxAttribute',
      modelAttribute: true,
      parameters: [
        { kind: 'webRequest', type: Types.Any },
        { kind: 'model', type: Types.Any },
      ],
    },
    // Invoked initially to create the "formBean" attribute; afterwards it comes
    // from the session (see sessionAttributes).
    { name: 'createFormBean', modelAttribute: true, modelAttributeName: 'formBean' },
    { name: 'form', mapping: { method: 'GET', path: '' } },
    {
      name: 'processSubmit',
      mapping: { method: 'POST', path: '' },
      parameters: [
        {
          // `@Valid FormBean formBean` -- no name, so it is derived.
          kind: 'modelAttribute',
          type: Types.bean('org.springframework.samples.mvc.form.FormBean', newFormBean),
          valid: true,
        },
        { kind: 'bindingResult', type: Types.Any },
        { kind: 'modelValue', name: 'ajaxRequest', type: Types.Boolean },
        { kind: 'model', type: Types.Any },
        { kind: 'redirectAttributes', type: Types.Any },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.form.FormController')
export class FormController {
  ajaxAttribute(request: HttpServletRequest, model: Model): void {
    model.addAttribute('ajaxRequest', AjaxUtils.isAjaxRequest(request));
  }

  createFormBean(): FormBean {
    return newFormBean();
  }

  form(): void {}

  processSubmit(
    formBean: FormBean,
    result: BindingResult,
    ajaxRequest: boolean,
    model: Model,
    redirectAttrs: RedirectAttributes,
  ): string | null {
    if (result.hasErrors()) {
      return null;
    }
    // Typically you would save to a db and clear the "formBean" attribute from
    // the session via SessionStatus.setCompleted(). For the demo we leave it.
    const message = 'Form submitted successfully.  Bound ' + String(formBean);
    if (ajaxRequest) {
      // prepare the model for rendering the success message in this request
      model.addAttribute('message', message);
      return null;
    } else {
      // store a success message for the next request after the redirect
      redirectAttrs.addFlashAttribute('message', message);
      return 'redirect:/form';
    }
  }
}
