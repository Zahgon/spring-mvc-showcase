/**
 * `org.springframework.samples.mvc.config.WebMvcConfig`.
 *
 * The original discovers its controllers with `@ComponentScan`. TypeScript has
 * no classpath to scan — a class exists only once its module has been
 * evaluated — so the components are listed here. That list *is* the component
 * scan, written down instead of implied.
 */

import { DispatcherServlet } from '../framework/web/DispatcherServlet.js';
import type { HttpMessageConverter } from '../framework/converter/HttpMessageConverter.js';
import { StringHttpMessageConverter } from '../framework/converter/StringHttpMessageConverter.js';
import { FormHttpMessageConverter } from '../framework/converter/FormHttpMessageConverter.js';
import {
  AtomFeedHttpMessageConverter,
  RssChannelHttpMessageConverter,
} from '../framework/converter/FeedHttpMessageConverters.js';
import { JaxbHttpMessageConverter } from '../framework/converter/JaxbHttpMessageConverter.js';
import { JacksonHttpMessageConverter } from '../framework/converter/JacksonHttpMessageConverter.js';
import {
  FormattingConversionService,
  maskFormatFormatter,
} from '../framework/convert/ConversionService.js';
import { controllerMetadataOf } from '../framework/web/metadata.js';
import { InternalResourceViewResolver } from '../framework/view/ViewResolver.js';
import { ClasslevelMappingController } from '../samples/mvc/mapping/ClasslevelMappingController.js';
import { MappingController } from '../samples/mvc/mapping/MappingController.js';
import { CallableController } from '../samples/mvc/async/CallableController.js';
import { DeferredResultController } from '../samples/mvc/async/DeferredResultController.js';
import { FileUploadController } from '../samples/mvc/fileupload/FileUploadController.js';
import { FormController } from '../samples/mvc/form/FormController.js';
import { RedirectController } from '../samples/mvc/redirect/RedirectController.js';
import { ValidationController } from '../samples/mvc/validation/ValidationController.js';
import { ViewsController } from '../samples/mvc/views/ViewsController.js';
import { ConvertController } from '../samples/mvc/convert/ConvertController.js';
import { MessageConvertersController } from '../samples/mvc/messageconverters/MessageConvertersController.js';
import { ExceptionController } from '../samples/mvc/exceptions/ExceptionController.js';
import { GlobalExceptionHandler } from '../samples/mvc/exceptions/GlobalExceptionHandler.js';
import { CustomArgumentController } from '../samples/mvc/data/custom/CustomArgumentController.js';
import { RequestDataController } from '../samples/mvc/data/RequestDataController.js';
import { StandardArgumentsController } from '../samples/mvc/data/standard/StandardArgumentsController.js';
import { ResponseController } from '../samples/mvc/response/ResponseController.js';
import { SimpleController } from '../samples/mvc/simple/SimpleController.js';
import { SimpleControllerRevisited } from '../samples/mvc/simple/SimpleControllerRevisited.js';

/** `@ComponentScan(basePackages = "org.springframework.samples.mvc")`. */
export function componentScan(): object[] {
  return [
    new SimpleController(),
    new SimpleControllerRevisited(),
    new ClasslevelMappingController(),
    new MappingController(),
    new ResponseController(),
    new RequestDataController(),
    new CustomArgumentController(),
    new StandardArgumentsController(),
    new ExceptionController(),
    new GlobalExceptionHandler(),
    new MessageConvertersController(),
    new ConvertController(),
    new ValidationController(),
    new ViewsController(),
    new FormController(),
    new FileUploadController(),
    new CallableController(),
    new DeferredResultController(),
  ];
}

/**
 * The converters `@EnableWebMvc` installs, in Spring's own order. The order is
 * observable: it decides which converter claims a response body when more than
 * one could write it.
 */
export function messageConverters(): HttpMessageConverter[] {
  return [
    new StringHttpMessageConverter(),
    new FormHttpMessageConverter(),
    new AtomFeedHttpMessageConverter(),
    new RssChannelHttpMessageConverter(),
    new JaxbHttpMessageConverter(),
    new JacksonHttpMessageConverter(),
  ];
}

/** `WebMvcConfig.addFormatters`. */
export function conversionService(): FormattingConversionService {
  const service = new FormattingConversionService();
  service.addFormatterForFieldAnnotation(maskFormatFormatter);
  return service;
}

/** `WebMvcConfig.configureViewResolvers`: `registry.jsp("/WEB-INF/views/", ".jsp")`. */
export function viewResolver(): InternalResourceViewResolver {
  return new InternalResourceViewResolver('/WEB-INF/views/', '.jsp');
}

/** `WebMvcConfig.addViewControllers`: `registry.addViewController("/").setViewName("home")`. */
export function viewControllers(): Map<string, string> {
  return new Map([['/', 'home']]);
}

/** Builds the dispatcher the way `WebMvcConfig` configures it. */
export function webMvcConfig(): DispatcherServlet {
  const formatting = conversionService();
  const dispatcher = new DispatcherServlet(
    messageConverters(),
    formatting,
    viewResolver(),
    viewControllers(),
  );
  for (const bean of [...componentScan(), new RedirectController(formatting)]) {
    const metadata = controllerMetadataOf(bean);
    if (metadata !== undefined) {
      dispatcher.register(bean, metadata);
    }
  }
  return dispatcher;
}
