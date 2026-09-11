import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { Callable, sleep, WebAsyncTask } from '../../../framework/async/Async.js';
import { IllegalArgumentException, IllegalStateException } from '../../../framework/web/exceptions.js';
import type { Model } from '../../../framework/ui/Model.js';
import { JavaClass } from '../../../java/lang/Objects.js';

@Controller({
  name: 'org.springframework.samples.mvc.async.CallableController',
  mapping: { path: '/async/callable' },
  methods: [
    { name: 'callable', mapping: { method: 'GET', path: '/response-body' }, responseBody: true },
    {
      name: 'callableWithView',
      mapping: { method: 'GET', path: '/view' },
      parameters: [{ kind: 'model', type: Types.Any }],
    },
    {
      name: 'callableWithException',
      mapping: { method: 'GET', path: '/exception' },
      responseBody: true,
      parameters: [
        {
          kind: 'requestParam',
          name: 'handled',
          type: Types.Boolean,
          required: false,
          defaultValue: 'true',
        },
      ],
    },
    {
      name: 'callableWithCustomTimeoutHandling',
      mapping: { method: 'GET', path: '/custom-timeout-handling' },
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
@JavaClass('org.springframework.samples.mvc.async.CallableController')
export class CallableController {
  callable(): Callable<string> {
    return new Callable<string>(async () => {
      await sleep(2000);
      return 'Callable result';
    });
  }

  callableWithView(model: Model): Callable<string> {
    return new Callable<string>(async () => {
      await sleep(2000);
      model.addAttribute('foo', 'bar');
      model.addAttribute('fruit', 'apple');
      return 'views/html';
    });
  }

  callableWithException(handled: boolean): Callable<string> {
    return new Callable<string>(async () => {
      await sleep(2000);
      if (handled) {
        // see handleException below
        throw new IllegalStateException('Callable error');
      } else {
        throw new IllegalArgumentException('Callable error');
      }
    });
  }

  callableWithCustomTimeoutHandling(): WebAsyncTask<string> {
    const callable = async (): Promise<string> => {
      await sleep(2000);
      return 'Callable result';
    };
    return new WebAsyncTask<string>(1000, callable);
  }

  handleException(ex: Error): string {
    return 'Handled exception: ' + ex.message;
  }
}
