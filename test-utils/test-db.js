const elasticsearch = require('elasticsearch');

let apiVersion = null;
let client = null;

// Es 5.0+ uses proper keyword mapping, whereas 2.4 uses not analyzed strings
// for the same purpose.
const keywordMapping = getApiVersion() === '2.4'
  ? { type: 'string', index: 'not_analyzed' }
  : { type: 'keyword' };

const schema = {
  index: 'test',
  body: {
    mappings: {
      people: {
        properties: {
          name: keywordMapping,
          tags: keywordMapping,
          addresses: {
            type: 'nested',
            properties: {
              street: keywordMapping
            }
          }
        }
      },
      mobiles: {
        _parent: {
          type: 'people'
        },
        properties: {
          number: keywordMapping
        }
      },
      todos: {
        properties: {
          text: keywordMapping
        }
      }
    }
  }
};

const serviceConfigs = {
  todos: {
    index: 'test',
    type: 'todos',
    refresh: true
  },
  people: {
    index: 'test',
    type: 'people',
    refresh: true
  },
  mobiles: {
    index: 'test',
    type: 'mobiles',
    refresh: true
  }
};

function getApiVersion () {
  if (!apiVersion) {
    const esVersion = process.env.ES_VERSION || '2.4.0';
    apiVersion = esVersion.split('.').slice(0, 2).join('.');
  }

  return apiVersion;
}

function getClient () {
  if (!client) {
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      apiVersion: getApiVersion()
    });
  }

  return client;
}

function getServiceConfig (serviceName) {
  return serviceConfigs[serviceName] || {};
}

function deleteSchema () {
  return getClient().indices.exists({ index: 'test' })
    .then(exists => exists && getClient().indices.delete({ index: 'test' }));
}

function createSchema () {
  return getClient().indices.create(schema);
}

function resetSchema () {
  return deleteSchema()
    .then(createSchema);
}

module.exports = {
  getApiVersion,
  getClient,
  getServiceConfig,
  resetSchema,
  deleteSchema,
  createSchema
};
