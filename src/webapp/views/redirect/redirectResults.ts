/**
 * `WEB-INF/views/redirect/redirectResults.jsp`, translated. The directives leave their newlines behind, so the
 * rendered page still opens with the blank lines the container emitted.
 */

import type { ViewModel } from '../../../framework/view/ViewTemplate.js';
import { text, url } from '../../../framework/view/tags/Html.js';
import type { HttpServletRequest } from '../../../framework/http/Servlet.js';

export function render(
  model: ViewModel,
  contextPath: string,
  request: HttpServletRequest,
): string {
  return `


<html>
<head>
	<title>Redirect Results</title>
	<link href="${url(contextPath, '/resources/form.css')}" rel="stylesheet"  type="text/css" />		
</head>
<body>
<div class="success">
	<h3>Path variable 'account': ${text(model.get('account'))}</h3>
	<h3>Query param 'date': ${text(request.getParameter('date'))}</h3>
</div>
</body>
</html>`;
}
