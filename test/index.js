const { expect } = require('chai');
const { base, example } = require('feathers-service-tests');

const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const service = require('../lib');
const exampleApp = require('../test-utils/example-app');
const db = require('../test-utils/test-db');
const coreTests = require('./core');

describe('Elasticsearch Service', () => {
  const app = feathers();
  const serviceName = 'people';

  before(() => {
    return db.resetSchema()
      .then(() => {
        app.use(`/${serviceName}`, service({
          Model: db.getClient(),
          events: ['testing'],
          id: 'id',
          elasticsearch: db.getServiceConfig(serviceName)
        }));
        app.use('/mobiles', service({
          Model: db.getClient(),
          id: 'id',
          parent: 'parent',
          elasticsearch: db.getServiceConfig('mobiles')
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
            addresses: [ { street: '1 The Road' }, { street: 'Programmer Lane' } ]
          },
          {
            id: 'moody',
            name: 'Moody',
            bio: 'I don\'t like .NET.',
            tags: ['programmer'],
            addresses: [ { street: '2 The Road' }, { street: 'Developer Lane' } ]
          },
          {
            id: 'douglas',
            name: 'Douglas',
            bio: 'A legend',
            tags: ['javascript', 'legend', 'programmer'],
            addresses: [ { street: '3 The Road' }, { street: 'Coder Alley' } ]
          }
        ])
      )
      .then(() => app.service('mobiles')
        .create([
          { number: '991', parent: 'douglas', id: 'douglasMobile' },
          { number: '992', parent: 'douglas' },
          { number: '991', parent: 'moody' }
        ])
      )
    );

    after(() => {
      app.service(serviceName).remove(null, { query: { $limit: 1000 } });
    });

    coreTests.find(app, serviceName);
    coreTests.get(app, serviceName);
    coreTests.create(app, serviceName);
    coreTests.patch(app, serviceName);
    coreTests.remove(app, serviceName);
    coreTests.update(app, serviceName);
    coreTests.raw(app, serviceName);
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
