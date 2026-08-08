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
  // Optimization: instead of the previous foreach that opened each article
  // detail page via a serial CDP navigate (~6s/page, 25 pages = ~160s), we
  // navigate once to the listing, then concurrently fetch() every article
  // HTML inside the same browser tab and parse it with DOMParser. This keeps
  // field extraction identical (same selectors) while cutting runtime from
  // ~160s to ~10-20s. See SKILL analysis for details.
  pipeline: [
    { navigate: 'https://claude.com/blog' },
    { evaluate: `
        (async () => {
          const days = \${{ args.days }};
          const limit = \${{ args.limit }};
          const cutoff = Date.now() - days * 86400000;

          // 1. Collect unique article links from the listing page.
          const seenHref = new Set();
          const urls = [];
          document.querySelectorAll('a[href^="/blog/"]').forEach(a => {
            const href = a.getAttribute('href');
            if (!href || href === '/blog/' || href === '/blog' || href.includes('/category/')) return;
            if (seenHref.has(href)) return;
            seenHref.add(href);
            urls.push('https://claude.com' + href);
          });

          // 2. Concurrently fetch detail pages and extract fields.
          //    Grab a small window beyond the requested limit so the date
          //    filter still has enough candidates after pruning.
          const batchSize = Math.min(urls.length, limit + 10);
          const fetched = await Promise.all(urls.slice(0, batchSize).map(async (url) => {
            try {
              const res = await fetch(url);
              const html = await res.text();
              const doc = new DOMParser().parseFromString(html, 'text/html');

              const title = (doc.querySelector('h1')?.textContent || '').trim();

              let publishedDate = '';
              for (const li of doc.querySelectorAll('.hero_blog_post_details_item')) {
                const label = li.querySelector('.u-text-style-caption');
                if (label && label.textContent.trim() === 'Date') {
                  publishedDate = (li.querySelector('.u-text-style-body-3')?.textContent || '').trim();
                  break;
                }
              }

              const category = (doc.querySelector('a[href*="/blog/category/"]')?.textContent || '').trim();

              let summary = '';
              const rich = doc.querySelector('.u-rich-text-blog');
              const paragraphs = rich ? rich.querySelectorAll('p') : [];
              for (const p of paragraphs) {
                const text = p.textContent.trim();
                if (text.length > 40 && !text.startsWith('Thank') && !text.startsWith('Oops') && !text.startsWith('Try Claude') && !text.startsWith('Download') && !text.startsWith('Read more') && !text.includes('submission has been received')) {
                  summary = text.slice(0, 300) + (text.length > 300 ? '...' : '');
                  break;
                }
              }

              const publishedTs = publishedDate ? new Date(publishedDate).getTime() : 0;
              return { title, publishedDate, publishedTs, category, summary, url };
            } catch (e) {
              return { title: '', publishedTs: 0, url };
            }
          }));

          // 3. Filter / dedupe / sort / limit (semantics match the old pipeline).
          const seenUrl = new Set();
          return fetched
            .filter(r => r.title && r.title.length > 0 && r.publishedTs > 0)
            .filter(r => (seenUrl.has(r.url) ? false : seenUrl.add(r.url)))
            .filter(r => r.publishedTs >= cutoff)
            .sort((a, b) => b.publishedTs - a.publishedTs)
            .slice(0, limit)
            .map(r => ({
              title: r.title,
              publishedDate: r.publishedDate,
              category: r.category,
              summary: r.summary,
              url: r.url,
            }));
        })()
      ` },
  ],
};
