import { beforeEach, test } from 'vitest';
import { FormController } from '../../src/samples/mvc/form/FormController.js';
import { TimeZone } from '../../src/java/util/TimeZone.js';
import { JavaDate } from '../../src/java/util/Date.js';
import { post, type MockMvc } from '../support/MockMvc.js';
import { flash, model, redirectedUrl, status, view } from '../support/matchers.js';
import { standaloneSetup } from '../support/context.js';

let mockMvc: MockMvc;

beforeEach(() => {
  mockMvc = standaloneSetup(new FormController()).build();
});

const EXPECTED = (timezone: string): string =>
  'Form submitted successfully.  Bound properties name=' +
  "'Joe', age=56, " +
  'birthDate=Tue Dec 16 00:00:00 ' +
  timezone +
  " 1941, phone='(347) 888-1234', " +
  "currency=123.33, percent=0.89, inquiry=comment, inquiryDetails='what is?'," +
  ' subscribeNewsletter=false, additionalInfo={java=true, mvc=true}';

test('submitSuccess', async () => {
  const timezone = getTimezone(1941, 12, 16);
  await mockMvc
    .perform(
      post('/form')
        .param('name', 'Joe')
        .param('age', '56')
        .param('birthDate', '1941-12-16')
        .param('phone', '(347) 888-1234')
        .param('currency', '$123.33')
        .param('percent', '89%')
        .param('inquiry', 'comment')
        .param('inquiryDetails', 'what is?')
        .param('additionalInfo[mvc]', 'true')
        .param('_additionalInfo[mvc]', 'on')
        .param('additionalInfo[java]', 'true')
        .param('_additionalInfo[java]', 'on')
        .param('subscribeNewsletter', 'false'),
    )
    .andExpect(status().isMovedTemporarily())
    .andExpect(redirectedUrl('/form'))
    .andExpect(flash().attribute('message', EXPECTED(timezone)));
});

test('submitSuccessAjax', async () => {
  const timezone = getTimezone(1941, 12, 16);
  await mockMvc
    .perform(
      post('/form')
        .header('X-Requested-With', 'XMLHttpRequest')
        .param('name', 'Joe')
        .param('age', '56')
        .param('birthDate', '1941-12-16')
        .param('phone', '(347) 888-1234')
        .param('currency', '$123.33')
        .param('percent', '89%')
        .param('inquiry', 'comment')
        .param('inquiryDetails', 'what is?')
        .param('additionalInfo[mvc]', 'true')
        .param('_additionalInfo[mvc]', 'on')
        .param('additionalInfo[java]', 'true')
        .param('_additionalInfo[java]', 'on')
        .param('subscribeNewsletter', 'false'),
    )
    .andExpect(status().isOk())
    .andExpect(view().name('form'))
    .andExpect(model().hasNoErrors())
    .andExpect(model().attribute('message', EXPECTED(timezone)));
});

test('submitError', async () => {
  await mockMvc
    .perform(post('/form'))
    .andExpect(status().isOk())
    .andExpect(view().name('form'))
    .andExpect(model().errorCount(2))
    .andExpect(model().attributeHasFieldErrors('formBean', 'name', 'age'));
});

/** The same run-time timezone lookup the Java test performs. */
function getTimezone(year: number, month: number, day: number): string {
  const date = JavaDate.from(year, month, day);
  const timezone = TimeZone.getDefault();
  return timezone.getDisplayName(timezone.inDaylightTime(date), TimeZone.SHORT);
}
