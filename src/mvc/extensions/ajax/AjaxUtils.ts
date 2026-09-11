import type { HttpServletRequest } from '../../../framework/http/Servlet.js';

export const AjaxUtils = {
  isAjaxRequest(webRequest: HttpServletRequest): boolean {
    const requestedWith = webRequest.getHeader('X-Requested-With');
    return requestedWith !== null ? requestedWith === 'XMLHttpRequest' : false;
  },

  isAjaxUploadRequest(webRequest: HttpServletRequest): boolean {
    return webRequest.getParameter('ajaxUpload') !== null;
  },
} as const;
