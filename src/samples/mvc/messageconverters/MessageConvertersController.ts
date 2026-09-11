import { Controller } from '../../../framework/web/metadata.js';
import { Types } from '../../../framework/convert/TypeDescriptor.js';
import { Channel, Feed } from '../../../framework/feed/Feed.js';
import { LinkedMultiValueMap } from '../../../framework/util/MultiValueMap.js';
import { JavaClass } from '../../../java/lang/Objects.js';
import { JavaBean } from './JavaBean.js';

const beanType = Types.bean(
  'org.springframework.samples.mvc.messageconverters.JavaBean',
  () => new JavaBean(),
);

@Controller({
  name: 'org.springframework.samples.mvc.messageconverters.MessageConvertersController',
  restController: true,
  mapping: { path: '/messageconverters' },
  methods: [
    // StringHttpMessageConverter
    {
      name: 'readString',
      mapping: { method: 'POST', path: '/string' },
      parameters: [{ kind: 'requestBody', type: Types.String }],
    },
    { name: 'writeString', mapping: { method: 'GET', path: '/string' } },

    // Form encoded data (application/x-www-form-urlencoded)
    {
      name: 'readForm',
      mapping: { method: 'POST', path: '/form' },
      // `@ModelAttribute JavaBean bean`: the name comes from the type, not
      // from the parameter, so it is `javaBean`.
      parameters: [{ kind: 'modelAttribute', type: beanType }],
    },
    { name: 'writeForm', mapping: { method: 'GET', path: '/form' } },

    // Jaxb2RootElementHttpMessageConverter
    {
      name: 'readXml',
      mapping: { method: 'POST', path: '/xml' },
      parameters: [{ kind: 'requestBody', type: beanType }],
    },
    { name: 'writeXml', mapping: { method: 'GET', path: '/xml' } },

    // MappingJackson2HttpMessageConverter
    {
      name: 'readJson',
      mapping: { method: 'POST', path: '/json' },
      parameters: [{ kind: 'requestBody', type: beanType, valid: true }],
    },
    { name: 'writeJson', mapping: { method: 'GET', path: '/json' } },

    // AtomFeedHttpMessageConverter
    {
      name: 'readFeed',
      mapping: { method: 'POST', path: '/atom' },
      parameters: [{ kind: 'requestBody', type: Types.Feed }],
    },
    { name: 'writeFeed', mapping: { method: 'GET', path: '/atom' } },

    // RssChannelHttpMessageConverter
    {
      name: 'readChannel',
      mapping: { method: 'POST', path: '/rss' },
      parameters: [{ kind: 'requestBody', type: Types.Channel }],
    },
    { name: 'writeChannel', mapping: { method: 'GET', path: '/rss' } },
  ],
})
@JavaClass('org.springframework.samples.mvc.messageconverters.MessageConvertersController')
export class MessageConvertersController {
  readString(text: string): string {
    return "Read string '" + text + "'";
  }

  writeString(): string {
    return 'Wrote a string';
  }

  readForm(bean: JavaBean): string {
    return 'Read x-www-form-urlencoded: ' + String(bean);
  }

  writeForm(): LinkedMultiValueMap<string, string> {
    const map = new LinkedMultiValueMap<string, string>();
    map.add('foo', 'bar');
    map.add('fruit', 'apple');
    return map;
  }

  readXml(bean: JavaBean): string {
    return 'Read from XML: ' + String(bean);
  }

  writeXml(): JavaBean {
    return new JavaBean('bar', 'apple');
  }

  readJson(bean: JavaBean): string {
    return 'Read from JSON: ' + String(bean);
  }

  writeJson(): JavaBean {
    return new JavaBean('bar', 'apple');
  }

  readFeed(feed: Feed): string {
    return 'Read ' + feed.getTitle();
  }

  writeFeed(): Feed {
    const feed = new Feed();
    feed.setFeedType('atom_1.0');
    feed.setTitle('My Atom feed');
    return feed;
  }

  readChannel(channel: Channel): string {
    return 'Read ' + channel.getTitle();
  }

  writeChannel(): Channel {
    const channel = new Channel();
    channel.setFeedType('rss_2.0');
    channel.setTitle('My RSS feed');
    channel.setDescription('Description');
    channel.setLink('http://localhost:8080/mvc-showcase/rss');
    return channel;
  }
}
