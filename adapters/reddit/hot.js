export default {
  description: "Fetch hot posts from a Reddit subreddit.",
  args: [
    { name: 'subreddit', required: true, description: 'Subreddit name without the r/ prefix.' },
    { name: 'limit', default: 30, description: 'Maximum number of posts to return.' },
  ],
  output: {
    fields: {
      rank:     { type: 'string', description: '1-based rank in the hot listing' },
      title:    { type: 'string', description: 'Post title' },
      score:    { type: 'string', description: 'Post score' },
      comments: { type: 'string', description: 'Comment count' },
      author:   { type: 'string', description: 'Post author username' },
      selftext: { type: 'string', description: 'Post body text (first 150 chars), empty for image/video posts' },
      url:      { type: 'string', description: 'Original Reddit post URL' },
    },
  },
  columns: ['rank', 'title', 'score', 'comments', 'author', 'selftext', 'url'],
  pipeline: [
    { navigate: 'https://www.reddit.com/r/${{ args.subreddit }}/' },
    { evaluate: `(async () => {
        const subreddit = location.pathname.split('/').filter(Boolean)[1];
        const res = await fetch('https://www.reddit.com/r/' + subreddit + '/hot.json?limit=50', {
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });
        const data = await res.json();
        return (data?.data?.children || []).map(p => ({
          title:    p.data.title,
          score:    p.data.score,
          author:   p.data.author,
          comments: p.data.num_comments,
          selftext: p.data.selftext?.slice(0, 150) || '',
          url:      'https://reddit.com' + p.data.permalink,
        }));
      })()` },
    { map: {
      rank:     '${{ index + 1 }}',
      title:    '${{ item.title }}',
      score:    '${{ item.score }}',
      comments: '${{ item.comments }}',
      author:   '${{ item.author }}',
      selftext: '${{ item.selftext }}',
      url:      '${{ item.url }}',
    }},
    { limit: '${{ args.limit }}' },
  ],
};
