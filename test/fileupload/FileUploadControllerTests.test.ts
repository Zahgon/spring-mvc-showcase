import { test } from 'vitest';
import { MockMultipartFile, multipart } from '../support/MockMvc.js';
import { model } from '../support/matchers.js';
import { webAppContextSetup } from '../support/context.js';

test('readString', async () => {
  const file = new MockMultipartFile('file', 'orig', null, Buffer.from('bar'));

  await webAppContextSetup()
    .build()
    .perform(multipart('/fileupload').file(file))
    .andExpect(model().attribute('message', "File 'orig' uploaded successfully"));
});
