/**
 * `WEB-INF/views/views/dataBinding.jsp`, translated. The directives leave their newlines behind, so the
 * rendered page still opens with the blank lines the container emitted.
 */

import type { ViewModel } from '../../../framework/view/ViewTemplate.js';
import { property, text, url } from '../../../framework/view/tags/Html.js';

export function render(model: ViewModel, contextPath: string): string {
  return `

<html>
<head>
	<title>Data Binding with URI Template Variables</title>
	<link href="${url(contextPath, '/resources/form.css')}" rel="stylesheet"  type="text/css" />		
</head>
<body>
<div class="success">
	<h3>javaBean.foo: ${text(property(model.get('javaBean'), 'foo'))}</h3>
	<h3>javaBean.fruit: ${text(property(model.get('javaBean'), 'fruit'))}</h3>
</div>
</body>
</html>`;
}
