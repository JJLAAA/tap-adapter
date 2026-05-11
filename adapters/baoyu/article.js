export default {
  description: 'Extract article metadata and body text from a baoyu.io blog URL.',
  args: [
    { name: 'url', default: '', description: 'Full URL of the baoyu.io article, e.g. https://baoyu.io/translations/2026-05-10/slug' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title: {
        type: 'string',
        description: 'Article title.',
      },
      author: {
        type: 'string',
        description: 'Original article author.',
      },
      publishedDate: {
        type: 'string',
        description: 'Publish date on baoyu.io.',
        format: 'date',
      },
      translatedDate: {
        type: 'string',
        description: 'Original translation date.',
        format: 'date',
      },
      sourceUrl: {
        type: 'string',
        description: 'Original source URL (usually X/Twitter).',
        format: 'url',
      },
      sourceTitle: {
        type: 'string',
        description: 'Original article title.',
      },
      bodyText: {
        type: 'string',
        description: 'Full article body text.',
      },
    },
  },
  columns: ['title', 'author', 'publishedDate', 'sourceTitle', 'bodyText'],
  pipeline: [
    { navigate: '${{ args.url }}' },
    { evaluate: `(() => {
        const article = document.querySelector('article');
        if (!article) return [];

        const metaDiv = article.children[1];
        const title = metaDiv.querySelector('h1')?.textContent?.trim() || '';

        const times = metaDiv.querySelectorAll('time');
        const publishedDate = times[0]?.getAttribute('datetime') || '';
        const translatedDate = times[1]?.getAttribute('datetime') || '';

        const sourceLink = metaDiv.querySelector('a[href*="x.com"], a[href*="twitter.com"]');
        const sourceUrl = sourceLink?.href || '';
        const sourceTitle = sourceLink?.textContent?.trim() || '';

        const authorMatch = metaDiv.textContent.match(/作者[：:]\\s*(.+)/);
        const author = authorMatch ? authorMatch[1].trim() : '';

        const proseDiv = article.querySelector('.prose');
        const bodyText = proseDiv?.textContent?.trim() || '';

        return [{
          title,
          author,
          publishedDate,
          translatedDate,
          sourceUrl,
          sourceTitle,
          bodyText,
        }];
      })()` },
    { map: {
      title: '${{ item.title }}',
      author: '${{ item.author }}',
      publishedDate: '${{ item.publishedDate }}',
      translatedDate: '${{ item.translatedDate }}',
      sourceUrl: '${{ item.sourceUrl }}',
      sourceTitle: '${{ item.sourceTitle }}',
      bodyText: '${{ item.bodyText }}',
    }},
    { limit: 1 },
  ],
  examples: [
    { description: 'Fetch an article by URL', args: { url: 'https://baoyu.io/translations/2026-05-10/championswimmer-2051807284691612099' } },
  ],
};
