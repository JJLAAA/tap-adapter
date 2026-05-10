export default {
  description: 'Fetch a single blog post\'s content from simonwillison.net given its URL.',
  args: [
    { name: 'url', default: '', description: 'Full URL of the blog post, e.g. https://simonwillison.net/2026/May/9/luke-curley/' },
  ],
  output: {
    type: 'list',
    itemName: 'post',
    fields: {
      title: { type: 'string', description: 'Article title.' },
      url: { type: 'string', description: 'Canonical article URL.', format: 'url' },
      date: { type: 'string', description: 'Publication date.', format: 'date' },
      type: { type: 'string', description: 'Post type: "article" or "quote".' },
      content: { type: 'string', description: 'Full text content of the blog post.' },
      sourceUrl: { type: 'string', description: 'Quote source URL (quote posts only, empty for articles).', format: 'url', nullable: true },
      tags: { type: 'array', description: 'Tags associated with the post.' },
    },
  },
  columns: ['title', 'date', 'type', 'tags'],
  examples: [
    { description: 'Fetch a quote post', args: { url: 'https://simonwillison.net/2026/May/9/luke-curley/' } },
    { description: 'Fetch an article', args: { url: 'https://simonwillison.net/2026/May/7/xai-anthropic/' } },
  ],
  pipeline: [
    { navigate: '${{ args.url }}' },
    { evaluate: `(() => {
      const entry = document.querySelector('.entry.entryPage');
      if (!entry) return [];

      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const dateEl = entry.querySelector('.mobile-date, .mobile-date-eyebrow');
      const tags = Array.from(document.querySelectorAll('a[rel="tag"]')).map(t =>
        t.textContent.trim().split('\\n')[0].trim()
      );

      const quoteDiv = entry.querySelector('.quote');
      const type = quoteDiv ? 'quote' : 'article';

      let content = '';
      let sourceUrl = '';

      if (type === 'quote') {
        const blockquote = quoteDiv.querySelector('blockquote');
        const citeEl = quoteDiv.querySelector('.cite');
        const quoteText = blockquote ? blockquote.textContent.trim() : '';
        const citeText = citeEl ? citeEl.textContent.trim() : '';
        content = quoteText + (citeText ? '\\n\\n' + citeText : '');
        sourceUrl = blockquote?.getAttribute('cite') || '';
      } else {
        const contentDiv = entry.children[0];
        const parts = [];
        for (const child of contentDiv.children) {
          if (child.tagName === 'H2') continue;
          if (child.classList.contains('mobile-date') || child.classList.contains('mobile-date-eyebrow')) continue;
          const text = child.textContent.trim();
          if (text) parts.push(text);
        }
        content = parts.join('\\n\\n');
      }

      return [{
        title: ogTitle,
        url: window.location.href,
        date: dateEl ? dateEl.textContent.trim() : '',
        type,
        content,
        sourceUrl,
        tags,
      }];
    })()` },
  ],
};
