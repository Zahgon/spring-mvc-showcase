/**
 * `WEB-INF/views/fileupload.jsp`, translated.
 *
 * The page renders twice over: in full for a browser, and as the inner
 * `fileuploadContent` div alone when jQuery asks for it, which is what the
 * `${!ajaxRequest}` guards around the `<html>` wrapper decide.
 */

import type { ViewModel } from '../../framework/view/ViewTemplate.js';
import { notEmpty, text, truthy, url } from '../../framework/view/tags/Html.js';

export function render(model: ViewModel, contextPath: string): string {
  const ajaxRequest = truthy(model.get('ajaxRequest'));
  const message = model.get('message');
  // `<c:url var="actionUrl" .../>` binds the URL to a variable rather than
  // writing it out; the CSRF token has to be in the query string because the
  // multipart body is not parsed before the filter checks it.
  const csrf = model.get('_csrf') as { getParameterName(): string; getToken(): string } | undefined;
  const actionUrl = url(
    contextPath,
    'fileupload?' +
      (csrf === undefined ? '=' : csrf.getParameterName() + '=' + csrf.getToken()),
  );
  return (
    // The taglib directive, whose newline survives the `<c:if>` either way.
    '\n' +
    (!ajaxRequest
      ? `
<html>
<head>
	<title>fileupload | mvc-showcase</title>
	<link href="${url(contextPath, '/resources/form.css')}" rel="stylesheet"  type="text/css" />		
	<script type="text/javascript" src="${url(contextPath, '/resources/jquery/1.6/jquery.js')}"></script>
	<script type="text/javascript" src="${url(contextPath, '/resources/jqueryform/2.8/jquery.form.js')}"></script>	
</head>
<body>
`
      : '') +
    `
	<div id="fileuploadContent">
		<h2>File Upload</h2>
		<p>
			See the <code>org.springframework.samples.mvc.fileupload</code> package for the @Controller code	
		</p>
		<!--
		    File Uploads must include CSRF in the URL.
		    See https://docs.spring.io/spring-security/site/docs/3.2.x/reference/htmlsingle/#csrf-multipart
		-->
		
		<form id="fileuploadForm" action="${actionUrl}" method="POST" enctype="multipart/form-data" class="cleanform">
			<div class="header">
		  		<h2>Form</h2>
		  		` +
    (notEmpty(message)
      ? `
					<div id="message" class="success">${text(message)}</div>	  		
		  		`
      : '') +
    `
			</div>
			<label for="file">File</label>
			<input id="file" type="file" name="file" />
			<p><button type="submit">Upload</button></p>		
		</form>
		<script type="text/javascript">
			$(document).ready(function() {
				$('<input type="hidden" name="ajaxUpload" value="true" />').insertAfter($("#file"));
				$("#fileuploadForm").ajaxForm({ success: function(html) {
						$("#fileuploadContent").replaceWith(html);
					}
				});
			});
		</script>	
	</div>
` +
    (!ajaxRequest
      ? `
</body>
</html>
`
      : '')
  );
}
