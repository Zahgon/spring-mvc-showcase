/**
 * `WEB-INF/views/form.jsp`, translated.
 *
 * Every field goes through the `BindStatus`, so a rejected `age=abc` comes back
 * in the field as `abc` next to its error, while a bound `currency` comes back
 * through its `@NumberFormat` as `$4.20`.
 */

import type { ViewModel } from '../../framework/view/ViewTemplate.js';
import type { HttpServletRequest } from '../../framework/http/Servlet.js';
import type { BindingResult } from '../../framework/bind/BindingResult.js';
import type { FormattingConversionService } from '../../framework/convert/ConversionService.js';
import { notEmpty, out, truthy, url } from '../../framework/view/tags/Html.js';
import {
  BindStatus,
  checkbox,
  errors,
  formTag,
  input,
  label,
  option,
  radiobutton,
  resetTagIds,
  select,
  textarea,
} from '../../framework/view/tags/FormTags.js';

export function render(
  model: ViewModel,
  contextPath: string,
  conversionService: FormattingConversionService,
  request: HttpServletRequest,
): string {
  resetTagIds();
  const ajaxRequest = truthy(model.get('ajaxRequest'));
  const message = model.get('message');
  const formBean = model.get('formBean') as object;
  const binding = (model.get('org.springframework.validation.BindingResult.formBean') ??
    null) as BindingResult | null;
  const status = new BindStatus(formBean, binding, conversionService);
  const csrf = model.get('_csrf') as { getParameterName(): string; getToken(): string } | undefined;

  const body =
    `
			<div class="header">
		  		<h2>Form</h2>
		  		` +
    (notEmpty(message)
      ? `
					<div id="message" class="success">${out(message)}</div>
		  		`
      : '') +
    `
		  		
		  			` +
    (status.hasErrors()
      ? `
				  		<div id="message" class="error">Form has errors</div>
		  			`
      : '') +
    `
		  		
			</div>
		  	<fieldset>
		  		<legend>Personal Info</legend>
		  		${label(
          'name',
          `
		  			Name ${errors(status, 'name', 'error')}
		 		`,
        )}
		  		${input(status, 'name')}
	
		  		${label(
          'age',
          `
		  			Age ${errors(status, 'age', 'error')}
		 		`,
        )}
		  		${input(status, 'age')}
		  		
		  		${label(
          'birthDate',
          `
		  			Birth Date (in form yyyy-mm-dd) ${errors(status, 'birthDate', 'error')}
		 		`,
        )}
		  		${input(status, 'birthDate')}
		  		 
		  		${label(
          'phone',
          `
		  			Phone (in form (###) ###-####) ${errors(status, 'phone', 'error')}
		  		`,
        )}
		  		${input(status, 'phone')}
	
		  		${label(
          'currency',
          `
		  			Currency (in form $#.##) ${errors(status, 'currency', 'error')}
		  		`,
        )}
		  		${input(status, 'currency')}
	
		  		${label(
          'percent',
          `
		  			Percentage (in form ##%) ${errors(status, 'percent', 'error')}
		  		`,
        )}
		  		${input(status, 'percent')}
	
		  	</fieldset>
	
			<fieldset>
				<legend>Inquiry</legend>
				${label(
          'inquiry',
          `
					Type (select one)
				`,
        )}
				${select(
          'inquiry',
          `
					${option(status, 'inquiry', 'comment', 'Comment')}
					${option(status, 'inquiry', 'feedback', 'Feedback')}
					${option(status, 'inquiry', 'suggestion', 'Suggestion')}
				`,
        )}
				
		  		${label(
          'inquiryDetails',
          `
		  			Details
		  		`,
        )}
		  		${textarea(status, 'inquiryDetails')}
		  	</fieldset>
	
			<fieldset class="checkbox">
				<legend>Request Additional Info</legend>
				<label>${checkbox(status, 'additionalInfo[mvc]', 'true')}on Spring MVC</label>
				<label>${checkbox(status, 'additionalInfo[java]', 'true')}on Java (4-ever)</label>				
			</fieldset>
		  		  	
			<fieldset class="radio">
				<legend>Subscribe to Newsletter?</legend>
				<label>${radiobutton(status, 'subscribeNewsletter', 'true')}Yes</label>
				<label>${radiobutton(status, 'subscribeNewsletter', 'false')} No</label>
			</fieldset>
	
			<p><button type="submit">Submit</button></p>
		`;

  return (
    // The four taglib and page directives, each leaving its own newline.
    '\n\n\n\n' +
    (!ajaxRequest
      ? `
<html>
<head>
	<title>forms | mvc-showcase</title>
	<link href="${url(contextPath, '/resources/form.css')}" rel="stylesheet"  type="text/css" />		
	<script type="text/javascript" src="${url(contextPath, '/resources/jquery/1.6/jquery.js')}"></script>
</head>
<body>
`
      : '') +
    `
	<div id="formsContent">
		<h2>Forms</h2>
		<p>
			See the <code>org.springframework.samples.mvc.form</code> package for the @Controller code	
		</p>
		${formTag({
      id: 'form',
      cssClass: 'cleanform',
      // The tag declares no action, so it posts back to the request it came
      // from — query string included.
      action:
        contextPath +
        request.getRequestURI() +
        (request.getQueryString() === null ? '' : '?' + request.getQueryString()!),
      method: 'post',
      body,
      hiddenFields:
        csrf === undefined ? [] : [[csrf.getParameterName(), csrf.getToken()] as [string, string]],
    })}
		<script type="text/javascript">
			$(document).ready(function() {
				$("#form").submit(function() {  
					$.post($(this).attr("action"), $(this).serialize(), function(html) {
						$("#formsContent").replaceWith(html);
						$('html, body').animate({ scrollTop: $("#message").offset().top }, 500);
					});
					return false;  
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
