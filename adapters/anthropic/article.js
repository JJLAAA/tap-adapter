export default {
  description: 'Fetch article content (title, date, body) from an Anthropic engineering/research blog URL.',
  args: [
    { name: 'url', description: 'Full URL of the Anthropic blog article (e.g. https://www.anthropic.com/engineering/managed-agents).' },
  ],
  examples: [
    { description: 'Fetch an engineering article', args: { url: 'https://www.anthropic.com/engineering/managed-agents' } },
  ],
  output: {
    type: 'list',
    itemName: 'article',
    fields: {
      title: {
        type: 'string',
        description: 'Article title.',
      },
      date: {
        type: 'string',
        description: 'Publication date, e.g. "Published Apr 08, 2026".',
      },
      content: {
        type: 'string',
        description: 'Full article body in markdown format (headings as ##, code blocks fenced).',
      },
      url: {
        type: 'string',
        description: 'Canonical article URL.',
        format: 'url',
      },
    },
  },
  columns: ['title', 'date', 'url'],
  pipeline: [
    { navigate: '${{ args.url }}' },
    { evaluate: `(() => {
      const title = document.querySelector('h1')?.textContent?.trim() || '';
      const date = document.querySelector('[class*="HeroEngineering"][class*="date"]')?.textContent?.trim() || '';

      const bodyDiv = document.querySelector('[class*="Body-module"]');
      if (!bodyDiv) return [{ title, date, content: '', url: location.href }];

      const elements = bodyDiv.querySelectorAll('h2, h3, h4, p, pre, blockquote, ul, ol');
      const parts = [];

      for (const el of elements) {
        const tag = el.tagName.toLowerCase();
        const text = el.textContent.trim();
        if (!text) continue;

        if (tag.match(/^h[2-4]$/)) {
          const hashes = '#'.repeat(parseInt(tag[1]));
          parts.push('\\n' + hashes + ' ' + text + '\\n');
        } else if (tag === 'p') {
          parts.push(text);
        } else if (tag === 'pre') {
          parts.push('\\n\\\`\\\`\\\`\\n' + text + '\\n\\\`\\\`\\\`\\n');
        } else if (tag === 'blockquote') {
          parts.push(text.split('\\n').map(l => '> ' + l).join('\\n'));
        } else if (tag === 'ul') {
          parts.push(Array.from(el.querySelectorAll('li')).map(li => '- ' + li.textContent.trim()).join('\\n'));
        } else if (tag === 'ol') {
          parts.push(Array.from(el.querySelectorAll('li')).map((li, i) => (i + 1) + '. ' + li.textContent.trim()).join('\\n'));
        }
      }

      return [{
        title: title,
        date: date,
        content: parts.join('\\n\\n'),
        url: location.href,
      }];
    })()` },
    { map: {
      title:   '${{ item.title }}',
      date:    '${{ item.date }}',
      content: '${{ item.content }}',
      url:     '${{ item.url }}',
    }},
  ],
};
