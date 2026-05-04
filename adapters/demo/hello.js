export default {
  description: 'Say hello.',
  args: [],
  output: {
    type: 'list',
    itemName: 'item',
    fields: {
      message: { type: 'string', description: 'Greeting.' },
    },
  },
  columns: ['message'],
  pipeline: [
    { map: { message: '"Hello from TAP!"' } },
  ],
};
