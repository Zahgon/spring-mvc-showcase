import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { DeferredResult } from '../../../framework/async/Async.js';
import { IllegalStateException } from '../../../framework/web/exceptions.js';
import { ModelAndView } from '../../../framework/web/ModelAndView.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

@Controller({
  name: 'org.springframework.samples.mvc.async.DeferredResultController',
  mapping: { path: '/async' },
  methods: [
    {
      name: 'deferredResult',
      mapping: { method: 'GET', path: '/deferred-result/response-body' },
      responseBody: true,
    },
    {
      name: 'deferredResultWithView',
      mapping: { method: 'GET', path: '/deferred-result/model-and-view' },
    },
    {
      name: 'deferredResultWithException',
      mapping: { method: 'GET', path: '/deferred-result/exception' },
      responseBody: true,
    },
    {
      name: 'deferredResultWithTimeoutValue',
      mapping: { method: 'GET', path: '/deferred-result/timeout-value' },
      responseBody: true,
    },
    {
      name: 'handleException',
      exceptionHandler: 'IllegalStateException',
      responseBody: true,
      parameters: [{ kind: 'exception', type: Types.Any }],
    },
  ],
})
@JavaClass('org.springframework.samples.mvc.async.DeferredResultController')
export class DeferredResultController {
  private readonly responseBodyQueue: DeferredResult<string>[] = [];

  private readonly mavQueue: DeferredResult<ModelAndView>[] = [];

  private readonly exceptionQueue: DeferredResult<string>[] = [];

  /** `@Scheduled(fixedRate=2000)`, started when the context is built. */
  private readonly scheduler: NodeJS.Timeout;

  constructor() {
    this.scheduler = setInterval(() => {
      this.processQueues();
    }, 2000);
    this.scheduler.unref?.();
  }

  deferredResult(): DeferredResult<string> {
    const result = new DeferredResult<string>();
    this.responseBodyQueue.push(result);
    return result;
  }

  deferredResultWithView(): DeferredResult<ModelAndView> {
    const result = new DeferredResult<ModelAndView>();
    this.mavQueue.push(result);
    return result;
  }

  deferredResultWithException(): DeferredResult<string> {
    const result = new DeferredResult<string>();
    this.exceptionQueue.push(result);
    return result;
  }

  deferredResultWithTimeoutValue(): DeferredResult<string> {
    // Provide a default result in case of timeout, overriding the container's
    // default timeout.
    return new DeferredResult<string>(1000, 'Deferred result after timeout');
  }

  handleException(ex: Error): string {
    return 'Handled exception: ' + ex.message;
  }

  processQueues(): void {
    for (const result of this.responseBodyQueue.splice(0)) {
      result.setResult('Deferred result');
    }
    for (const result of this.exceptionQueue.splice(0)) {
      result.setErrorResult(new IllegalStateException('DeferredResult error'));
    }
    for (const result of this.mavQueue.splice(0)) {
      result.setResult(new ModelAndView('views/html', 'javaBean', new JavaBean('bar', 'apple')));
    }
  }
}
