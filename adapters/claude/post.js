export default {
  description: 'Fetch full content of a single claude.com blog article given its URL.',
  args: [
    { name: 'url', default: '', description: 'Full URL of the blog article, e.g. https://claude.com/blog/new-in-claude-managed-agents' },
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
        description: 'Publication date (e.g. "May 6, 2026").',
        format: 'date',
      },
      category: {
        type: 'string',
        description: 'Blog category tag (e.g. Product announcements, Claude Code).',
        nullable: true,
      },
      content: {
        type: 'string',
        description: 'Full article body text with headings preserved as ## heading lines.',
      },
      url: {
        type: 'string',
        description: 'Canonical article URL.',
        format: 'url',
      },
    },
  },
  columns: ['title', 'publishedDate', 'category', 'content'],
  examples: [
    { description: 'Fetch a managed agents blog post', args: { url: 'https://claude.com/blog/new-in-claude-managed-agents' } },
    { description: 'Fetch a Claude Code blog post', args: { url: 'https://claude.com/blog/claude-code-best-practices' } },
  ],
  pipeline: [
    { navigate: '${{ args.url }}' },
    { evaluate: `(() => {
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

      const richText = document.querySelector('.u-rich-text-blog');
      let content = '';
      if (richText) {
        const parts = [];
        for (const child of richText.children) {
          const tag = child.tagName;
          if (tag === 'H2') {
            const text = child.textContent.trim();
            if (text) parts.push('## ' + text);
          } else if (tag === 'H3') {
            const text = child.textContent.trim();
            if (text) parts.push('### ' + text);
          } else if (tag === 'P') {
            const text = child.textContent.trim();
            if (text) parts.push(text);
          } else if (tag === 'UL' || tag === 'OL') {
            const items = [...child.querySelectorAll('li')].map(li => '- ' + li.textContent.trim());
            parts.push(items.join('\\n'));
          } else if (tag === 'BLOCKQUOTE') {
            const text = child.textContent.trim();
            if (text) parts.push('> ' + text);
          }
        }
        content = parts.join('\\n\\n');
      }

      return [{
        title,
        publishedDate,
        category,
        content,
        url: window.location.href,
      }];
    })()` },
  ],
};
