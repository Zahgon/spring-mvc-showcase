/**
 * The two MockMvc set-up styles the suite uses.
 *
 * `webAppContextSetup` builds the whole `WebMvcConfig` context, as nine test
 * classes do; `standaloneSetup` registers one controller with only the
 * infrastructure the test asks for, as seven do. The difference is observable,
 * so both exist here.
 */

import { DispatcherServlet } from '../../src/framework/web/DispatcherServlet.js';
import { messageConverters, webMvcConfig } from '../../src/config/WebMvcConfig.js';
import type { FormattingConversionService } from '../../src/framework/convert/ConversionService.js';
import { controllerMetadataOf } from '../../src/framework/web/metadata.js';
import { MockMvcBuilder } from './MockMvc.js';

/** `MockMvcBuilders.webAppContextSetup(this.wac)`. */
export function webAppContextSetup(): MockMvcBuilder {
  return new MockMvcBuilder(webMvcConfig());
}

/** `MockMvcBuilders.standaloneSetup(controller)`. */
export function standaloneSetup(...controllers: object[]): StandaloneMockMvcBuilder {
  return new StandaloneMockMvcBuilder(controllers);
}

/** `StandaloneMockMvcBuilder`, with the setters the suite calls on it. */
export class StandaloneMockMvcBuilder extends MockMvcBuilder {
  private conversionServiceOverride: FormattingConversionService | null = null;

  constructor(private readonly controllers: readonly object[]) {
    super(new DispatcherServlet(messageConverters()));
  }

  setConversionService(service: FormattingConversionService): this {
    this.conversionServiceOverride = service;
    return this;
  }

  override build() {
    const dispatcher =
      this.conversionServiceOverride === null
        ? new DispatcherServlet(messageConverters())
        : new DispatcherServlet(messageConverters(), this.conversionServiceOverride);
    for (const controller of this.controllers) {
      const metadata = controllerMetadataOf(controller);
      if (metadata !== undefined) {
        dispatcher.register(controller, metadata);
      }
    }
    return this.buildWith(dispatcher);
  }
}
