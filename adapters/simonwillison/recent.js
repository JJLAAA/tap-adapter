export default {
  description: "Fetch recent articles from Simon Willison blog feed.",
  args: [
    { name: 'days', default: 7, description: 'Number of recent days to include.' },
    { name: 'limit', default: 50, description: 'Maximum number of articles to return.' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title:     { type: 'string', description: 'Article title.' },
      url:       { type: 'string', description: 'Canonical article URL.', format: 'url' },
      published: { type: 'string', description: 'Publication date and time.', format: 'iso8601' },
      summary:   { type: 'string', description: 'Article summary as plain text (HTML stripped), up to 800 chars.' },
    },
  },
  columns: ['title', 'url', 'published', 'summary'],
  pipeline: [
    { navigate: 'https://simonwillison.net/atom/everything/' },
    { evaluate: `
        (() => {
          const entries = Array.from(document.querySelectorAll('entry'));
          return entries.map(e => {
            const link =
              e.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
              e.querySelector('link')?.getAttribute('href') || '';
            const rawSummary = e.querySelector('summary')?.textContent || '';
            const summary = rawSummary
              .replace(/<[^>]+>/g, ' ')
              .replace(/&#?[a-z0-9]+;/gi, ' ')
              .replace(/\\s+/g, ' ')
              .trim()
              .slice(0, 800);
            return {
              title:     e.querySelector('title')?.textContent?.trim(),
              url:       link.replace(/#.*$/, ''),
              published: e.querySelector('published')?.textContent?.trim(),
              summary,
            };
          });
        })()
      ` },
    { map: {
      title:     '${{ item.title }}',
      url:       '${{ item.url }}',
      published: '${{ item.published }}',
      summary:   '${{ item.summary }}',
    }},
    { filter: 'new Date(item.published) >= new Date(Date.now() - args.days * 86400000)' },
    { limit: '${{ args.limit }}' },
  ],
};
