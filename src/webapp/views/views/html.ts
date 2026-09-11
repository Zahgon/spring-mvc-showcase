/**
 * `WEB-INF/views/views/html.jsp`, translated. The directives leave their newlines behind, so the
 * rendered page still opens with the blank lines the container emitted.
 */

import type { ViewModel } from '../../../framework/view/ViewTemplate.js';
import { text, url } from '../../../framework/view/tags/Html.js';

export function render(model: ViewModel, contextPath: string): string {
  return `

<html>
<head>
	<title>My HTML View</title>
	<link href="${url(contextPath, '/resources/form.css')}" rel="stylesheet"  type="text/css" />		
</head>
<body>
<div class="success">
	<h3>foo: "${text(model.get('foo'))}"</h3>
	<h3>fruit: "${text(model.get('fruit'))}"</h3>
</div>
</body>
</html>`;
}
