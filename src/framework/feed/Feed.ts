/**
 * The `com.rometools.rome` model the showcase uses, and its serialisation.
 *
 * Rome pretty-prints with a two-space indent and leaves a trailing newline
 * after the closing element; both are visible in the captured Atom and RSS
 * responses, and `content().xml(...)` compares them as XML.
 */

export class Feed {
  private feedType = 'atom_1.0';

  private title = '';

  setFeedType(feedType: string): void {
    this.feedType = feedType;
  }

  getFeedType(): string {
    return this.feedType;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string {
    return this.title;
  }
}

export class Channel {
  private feedType = 'rss_2.0';

  private title = '';

  private description = '';

  private link = '';

  setFeedType(feedType: string): void {
    this.feedType = feedType;
  }

  getFeedType(): string {
    return this.feedType;
  }

  setTitle(title: string): void {
    this.title = title;
  }

  getTitle(): string {
    return this.title;
  }

  setDescription(description: string): void {
    this.description = description;
  }

  getDescription(): string {
    return this.description;
  }

  setLink(link: string): void {
    this.link = link;
  }

  getLink(): string {
    return this.link;
  }
}
