const schema = [
  {
    index: 'test',
    body: {
      mappings: {
        people: {
          properties: {
            name: { type: 'string', index: 'not_analyzed' },
            tags: { type: 'string', index: 'not_analyzed' },
            addresses: {
              type: 'nested',
              properties: {
                street: { type: 'string', index: 'not_analyzed' }
              }
            }
          }
        },
        aka: {
          _parent: {
            type: 'people'
          }
        },
        todos: {
          properties: {
            text: { type: 'string', index: 'not_analyzed' }
          }
        }
      }
    }
  }
];

module.exports = schema;
