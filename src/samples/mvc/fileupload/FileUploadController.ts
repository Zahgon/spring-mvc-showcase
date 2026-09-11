import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import type { Model } from '../../../framework/ui/Model.js';
import type { HttpServletRequest, MultipartFile } from '../../../framework/http/Servlet.js';
import { AjaxUtils } from '../../../mvc/extensions/ajax/AjaxUtils.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.fileupload.FileUploadController',
  mapping: { path: '/fileupload' },
  methods: [
    {
      name: 'ajaxAttribute',
      modelAttribute: true,
      parameters: [
        { kind: 'webRequest', type: Types.Any },
        { kind: 'model', type: Types.Any },
      ],
    },
    { name: 'fileUploadForm', mapping: { method: 'GET', path: '' } },
    {
      name: 'processUpload',
      mapping: { method: 'POST', path: '' },
      parameters: [
        { kind: 'multipartFile', name: 'file', type: Types.MultipartFile },
        { kind: 'model', type: Types.Any },
      ],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.fileupload.FileUploadController')
export class FileUploadController {
  ajaxAttribute(request: HttpServletRequest, model: Model): void {
    model.addAttribute('ajaxRequest', AjaxUtils.isAjaxRequest(request));
  }

  fileUploadForm(): void {}

  processUpload(file: MultipartFile, model: Model): void {
    model.addAttribute(
      'message',
      "File '" + String(file.getOriginalFilename()) + "' uploaded successfully",
    );
  }
}
