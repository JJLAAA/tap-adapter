export default {
  description: 'Fetch recent OpenAI Engineering articles from the OpenAI news feed.',
  args: [
    { name: 'category', default: 'Engineering', description: 'Category filter, comma-separated (e.g., "Research,Engineering").' },
    { name: 'days', default: 7, description: 'Days to look back when no date range specified.' },
    { name: 'startDate', default: '', description: 'Start date YYYY-MM-DD. Overrides days.' },
    { name: 'endDate', default: '', description: 'End date YYYY-MM-DD. Overrides days.' },
    { name: 'limit', default: 20, description: 'Maximum number of items to return.' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title: {
        type: 'string',
        description: 'Article title.',
      },
      publishDate: {
        type: 'string',
        description: 'Article publication date.',
        format: 'date',
      },
      url: {
        type: 'string',
        description: 'Original article URL.',
        format: 'url',
      },
      summary: {
        type: 'string',
        description: 'Article summary.',
      },
      category: {
        type: 'string',
        description: 'Article category (e.g., Engineering, Research).',
      },
    },
  },
  columns: ['title', 'publishDate', 'category', 'url', 'summary'],
  pipeline: [
    { navigate: 'https://openai.com/news/engineering/' },
    { evaluate: `(async () => {
        const res = await fetch('https://openai.com/news/rss.xml');
        const text = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/xml');
        const items = doc.querySelectorAll('item');

        const categories = '\${{ args.category }}'.split(',').map(s => s.trim());
        const startDateStr = '\${{ args.startDate }}';
        const endDateStr = '\${{ args.endDate }}';

        let start, end;
        if (startDateStr && endDateStr) {
          start = new Date(startDateStr + 'T00:00:00Z');
          end = new Date(endDateStr + 'T23:59:59Z');
        } else {
          end = new Date();
          start = new Date();
          start.setDate(start.getDate() - \${{ args.days }});
        }

        const results = [];
        items.forEach(item => {
          const cat = item.querySelector('category')?.textContent;
          if (!categories.includes(cat)) return;
          const pubDate = new Date(item.querySelector('pubDate')?.textContent);
          if (pubDate < start || pubDate > end) return;
          results.push({
            title: item.querySelector('title')?.textContent || '',
            publishDate: item.querySelector('pubDate')?.textContent || '',
            url: item.querySelector('link')?.textContent || '',
            summary: item.querySelector('description')?.textContent || '',
            category: cat,
          });
        });
        return results;
      })()` },
    { map: {
      title: '${{ item.title }}',
      publishDate: '${{ item.publishDate }}',
      url: '${{ item.url }}',
      summary: '${{ item.summary }}',
      category: '${{ item.category }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
};
