export default {
  description: 'Fetch recent blog articles from claude.com/blog within a configurable time window, with content summaries extracted from each article page.',
  args: [
    { name: 'limit', default: 10, description: 'Maximum number of articles to return.' },
    { name: 'days', default: 7, description: 'Number of recent days to look back for articles.' },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title: {
        type: 'string',
        description: 'Article title.',
      },
      publishedDate: {
        type: 'string',
        description: 'Article publication date (e.g. "April 14, 2026").',
        format: 'date',
      },
      category: {
        type: 'string',
        description: 'Blog category tag (e.g. Claude Code, Agents, Product announcements).',
        nullable: true,
      },
      summary: {
        type: 'string',
        description: 'First substantive paragraph of the article body, serving as a content overview.',
      },
      url: {
        type: 'string',
        description: 'Full URL to the original article.',
        format: 'url',
      },
    },
  },
  columns: ['title', 'publishedDate', 'category', 'summary'],
  pipeline: [
    { navigate: 'https://claude.com/blog' },
    { evaluate: `
        (() => {
          const seen = new Set();
          const urls = [];
          document.querySelectorAll('a[href^="/blog/"]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href || href === '/blog/' || href === '/blog' || href.includes('/category/')) return;
            if (seen.has(href)) return;
            seen.add(href);
            urls.push({ url: 'https://claude.com' + href });
          });
          return urls;
        })()
      ` },
    {
      foreach: {
        from: 'data',
        as: 'details',
        concurrency: 1,
        steps: [
          { navigate: '${{ item.url }}' },
          { evaluate: `
              (() => {
                const url = window.location.href;

                const h1 = document.querySelector('h1');
                const title = h1 ? h1.textContent.trim() : '';

                let publishedDate = '';
                const lis = document.querySelectorAll('.hero_blog_post_details_item');
                for (const li of lis) {
                  const label = li.querySelector('.u-text-style-caption');
                  if (label && label.textContent.trim() === 'Date') {
                    const val = li.querySelector('.u-text-style-body-3');
                    if (val) publishedDate = val.textContent.trim();
                    break;
                  }
                }

                const catLinks = document.querySelectorAll('a[href*="/blog/category/"]');
                const category = catLinks.length > 0 ? catLinks[0].textContent.trim() : '';

                let summary = '';
                const ps = document.querySelectorAll('p');
                for (const p of ps) {
                  const text = p.textContent.trim();
                  if (text.length > 40 && !text.startsWith('Thank') && !text.startsWith('Oops') && !text.startsWith('Try Claude') && !text.startsWith('Download') && !text.startsWith('Read more') && !text.includes('submission has been received')) {
                    summary = text.slice(0, 300) + (text.length > 300 ? '...' : '');
                    break;
                  }
                }

                const publishedTs = publishedDate ? new Date(publishedDate).getTime() : 0;
                return { title, publishedDate, publishedTs, category, summary, url };
              })()
            ` },
        ],
      },
    },
    { select: { from: 'details' } },
    { filter: 'item.title && item.title.length > 0 && item.publishedTs > 0' },
    { sort: { by: 'publishedTs', order: 'desc' } },
    { filter: '!(global._seen || (global._seen = new Set())).has(item.url) && global._seen.add(item.url)' },
    { filter: 'item.publishedTs >= Date.now() - args.days * 86400000' },
    { map: {
      title: '${{ item.title }}',
      publishedDate: '${{ item.publishedDate }}',
      category: '${{ item.category }}',
      summary: '${{ item.summary }}',
      url: '${{ item.url }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
};
