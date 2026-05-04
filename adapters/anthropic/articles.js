export default {
  description: 'Fetch engineering blog articles from anthropic.com with title, summary, date and link.',
  args: [
    { name: 'limit', default: 20, description: 'Maximum number of articles to return.' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      rank: {
        type: 'integer',
        description: 'One-based rank in the returned result set.',
      },
      title: {
        type: 'string',
        description: '文章标题。',
      },
      summary: {
        type: 'string',
        description: '内容梗概，取自文章正文首段。',
      },
      date: {
        type: 'string',
        description: '发布日期。',
        format: 'date',
      },
      url: {
        type: 'string',
        description: '原帖完整链接。',
        format: 'url',
      },
    },
  },
  columns: ['rank', 'title', 'date', 'summary', 'url'],
  pipeline: [
    { navigate: 'https://www.anthropic.com/engineering' },
    { evaluate: `(async () => {
      const links = [...new Set(
        [...document.querySelectorAll('article a[href^="/engineering/"]')]
          .map(a => a.href)
      )];

      const results = [];
      const batchSize = 5;
      for (let i = 0; i < links.length; i += batchSize) {
        const batch = links.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (url) => {
          try {
            const resp = await fetch(url);
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const title = doc.querySelector('h1')?.textContent?.trim() || '';

            const dateMatch = doc.body.textContent.match(/Published\\s+([A-Z][a-z]{2}\\s+\\d{1,2},\\s+\\d{4})/);
            const date = dateMatch?.[1] || '';

            const paragraphs = [...doc.querySelectorAll('p')]
              .map(p => p.textContent.trim())
              .filter(t => t.length > 80
                && !t.includes('Published')
                && !t.startsWith('Research')
                && !t.startsWith('Try Claude')
                && !t.startsWith('Get started')
              );

            const summary = paragraphs[0]?.slice(0, 300) || '';

            return { title, summary, date, url };
          } catch(e) {
            return null;
          }
        }));
        results.push(...batchResults.filter(Boolean));
      }
      return results;
    })()` },
    { map: {
      rank:    '${{ index + 1 }}',
      title:   '${{ item.title }}',
      summary: '${{ item.summary }}',
      date:    '${{ item.date }}',
      url:     '${{ item.url }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
};
