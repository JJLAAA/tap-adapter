export default {
  description: 'Extract article content from an OpenAI blog post URL.',
  args: [
    {
      name: 'url',
      default: '',
      description: 'Full URL of an OpenAI blog article, e.g. https://openai.com/index/mrc-supercomputer-networking/',
    },
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
        description: 'Publication date.',
        format: 'date',
      },
      category: {
        type: 'string',
        description: 'Article category (Engineering, Research, etc.).',
      },
      url: {
        type: 'string',
        description: 'Article canonical URL.',
        format: 'url',
      },
      content: {
        type: 'string',
        description: 'Full article body text in markdown format.',
      },
    },
  },
  columns: ['title', 'date', 'category'],
  pipeline: [
    { navigate: '${{ args.url }}' },
    { evaluate: `(() => {
      const main = document.querySelector('main');
      if (!main) return [{}];

      const title = main.querySelector('h1')?.textContent?.trim() || '';

      const dateEl = Array.from(main.querySelectorAll('p.text-meta')).find(p =>
        /^[A-Z][a-z]+ \\d{1,2}, \\d{4}$/.test(p.textContent.trim())
      );
      const date = dateEl?.textContent?.trim() || '';

      const catLink = main.querySelector('a[href*="/news/"]');
      const category = catLink?.textContent?.trim() || '';

      const url = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || location.href;

      const bodyParts = [];
      for (const el of main.querySelectorAll('p, h2, h3')) {
        if (el.textContent.trim() === 'Keep reading') break;
        const text = el.textContent?.trim();
        if (!text) continue;
        if (text === 'Listen to article' || text === 'Share' || /^\\d+:\\d+$/.test(text)) continue;
        if (/^[A-Z][a-z]+ \\d{1,2}, \\d{4}$/.test(text)) continue;
        if (el.tagName === 'P' && el.classList.contains('text-meta')) continue;
        if (el.querySelector('a[href*="/news/"]') && text.length < 20) continue;

        if (el.tagName === 'H2' || el.tagName === 'H3') {
          bodyParts.push('\\n' + '#'.repeat(parseInt(el.tagName[1])) + ' ' + text + '\\n');
        } else {
          bodyParts.push(text);
        }
      }

      return [{
        title,
        date,
        category,
        url,
        content: bodyParts.join('\\n\\n').trim(),
      }];
    })()` },
    { map: {
      title:    '${{ item.title }}',
      date:     '${{ item.date }}',
      category: '${{ item.category }}',
      url:      '${{ item.url }}',
      content:  '${{ item.content }}',
    }},
    { limit: 1 },
  ],
};
