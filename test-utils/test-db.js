const elasticsearch = require('elasticsearch');
const { getCompatVersion } = require('../lib/utils/core');

let apiVersion = null;
let client = null;
let allCompatVersions = ['2.4', '5.0'];

const compatVersion = getCompatVersion(allCompatVersions, getApiVersion());
const compatSchema = require(`./schema-${compatVersion}`);

function getServiceConfig (serviceName) {
  let index = 'test';
  let type = serviceName;

  if (Number(compatVersion) >= 6) {
    index = `test-${serviceName === 'aka' ? 'people' : serviceName}`;
    type = 'doc';
  }

  return { index, type, refresh: true };
}

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

function deleteSchema () {
  const index = compatSchema.map(indexSetup => indexSetup.index);

  return getClient().indices.delete({ index })
    .catch((err) => err.status !== 404 && Promise.reject(err));
}

function createSchema () {
  return compatSchema.reduce(
    (result, indexSetup) => result.then(() => getClient().indices.create(indexSetup)),
    Promise.resolve()
  );
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
