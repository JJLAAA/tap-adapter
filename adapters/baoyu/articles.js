export default {
  description: "Fetch recent Chinese-language articles from baoyu.io.",
  args: [
    { name: 'days', default: 7, description: 'Number of recent days to include.' },
    { name: 'limit', default: 20, description: 'Maximum number of articles to return.' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title: {
        type: 'string',
        description: '文章标题',
      },
      url: {
        type: 'string',
        description: '文章原贴链接',
        format: 'url',
      },
      summary: {
        type: 'string',
        description: '文章梗概/摘要',
      },
      date: {
        type: 'string',
        description: '发布日期',
        format: 'date',
      },
    },
  },
  columns: ['title', 'url', 'summary', 'date'],
  pipeline: [
    { navigate: 'https://baoyu.io/' },
    { evaluate: `
        (() => {
          const now = new Date();
          const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const articles = document.querySelectorAll('article');
          const results = [];
          for (const art of articles) {
            const h2 = art.querySelector('h2');
            const ps = art.querySelectorAll('p');
            const a = art.querySelector('a[href]');
            if (!h2 || !a) continue;
            const title = h2.textContent.trim();
            const summary = ps[0]?.textContent?.trim() || '';
            const dateStr = ps[1]?.textContent?.trim() || '';
            const url = a.href;
            const date = new Date(dateStr);
            if (date >= cutoff) {
              results.push({ title, url, summary, date: dateStr });
            }
          }
          return results;
        })()
      ` },
    { map: {
      title:   '${{ item.title }}',
      url:     '${{ item.url }}',
      summary: '${{ item.summary }}',
      date:    '${{ item.date }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
};
