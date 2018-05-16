const { expect } = require('chai');
const { base, example } = require('feathers-service-tests');

const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const service = require('../lib');
const exampleApp = require('../test-utils/example-app');
const db = require('../test-utils/test-db');
const coreTests = require('./core');
const { getCompatProp } = require('../lib/utils/core');

describe('Elasticsearch Service', () => {
  const app = feathers();
  const serviceName = 'people';
  const esVersion = db.getApiVersion();

  before(() => {
    return db.resetSchema()
      .then(() => {
        app.use(`/${serviceName}`, service({
          Model: db.getClient(),
          events: ['testing'],
          id: 'id',
          esVersion,
          elasticsearch: db.getServiceConfig(serviceName)
        }));
        app.use('/aka', service({
          Model: db.getClient(),
          id: 'id',
          parent: 'parent',
          esVersion,
          elasticsearch: db.getServiceConfig('aka'),
          join: getCompatProp({ '6.0': 'aka' }, esVersion)
        }));
      });
  });

  after(() => db.deleteSchema());

  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function');
  });

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to
        .throw('Elasticsearch options have to be provided');
    });

    it('throws an error when missing `options.Model`', () => {
      expect(service.bind(null, {})).to
        .throw('Elasticsearch `Model` (client) needs to be provided');
    });
  });

  base(app, errors, 'people', 'id');

  describe('Specific Elasticsearch tests', () => {
    before(() => app.service(serviceName)
      .remove(null, { query: { $limit: 1000 } })
      .then(() => app.service(serviceName)
        .create([
          {
            id: 'bob',
            name: 'Bob',
            bio: 'I like JavaScript.',
            tags: ['javascript', 'programmer'],
            addresses: [ { street: '1 The Road' }, { street: 'Programmer Lane' } ],
            aka: 'real'
          },
          {
            id: 'moody',
            name: 'Moody',
            bio: 'I don\'t like .NET.',
            tags: ['programmer'],
            addresses: [ { street: '2 The Road' }, { street: 'Developer Lane' } ],
            aka: 'real'
          },
          {
            id: 'douglas',
            name: 'Douglas',
            bio: 'A legend',
            tags: ['javascript', 'legend', 'programmer'],
            addresses: [ { street: '3 The Road' }, { street: 'Coder Alley' } ],
            aka: 'real'
          }
        ])
      )
      .then(() => {
        app.service('aka')
          .create([
            { name: 'The Master', parent: 'douglas', id: 'douglasAka', aka: 'alias' },
            { name: 'Teacher', parent: 'douglas', aka: 'alias' },
            { name: 'Teacher', parent: 'moody', aka: 'alias' }
          ]);
      })
    );

    after(() => {
      app.service(serviceName).remove(null, { query: { $limit: 1000 } });
    });

    coreTests.find(app, serviceName, esVersion);
    coreTests.get(app, serviceName);
    coreTests.create(app, serviceName);
    coreTests.patch(app, serviceName, esVersion);
    coreTests.remove(app, serviceName);
    coreTests.update(app, serviceName);
    coreTests.raw(app, serviceName, esVersion);
  });

  describe('Elasticsearch service example test', () => {
    let server = null;

    before(() => {
      server = exampleApp.listen(3030);
    });

    after(done => server.close(() => done()));

    // We test example app on the default id prop '_id' to check if it falls back correctly.
    example('_id');
  });
});
