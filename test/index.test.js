/* eslint-env mocha */
// The following is required for some of the Chai's `expect` assertions,
// e.g. expect(someVariable).to.be.empty;
/* eslint no-unused-expressions: "off" */
import { expect } from 'chai';
// remember to import example as well!
import { base, example } from 'feathers-service-tests';
import feathers from 'feathers';
import errors from 'feathers-errors';
import elasticsearch from 'elasticsearch';

import service from '../src';
import server from './test-app';

describe('Elasticsearch Service', () => {
  const app = feathers();
  const serviceName = 'people';
  const apiVersion = !process.env.ES_VERSION || process.env.ES_VERSION.split('.')[0] !== '5'
    ? '2.4'
    : '5.0';
  const keywordMapping = apiVersion === '2.4'
    ? { type: 'string', index: 'not_analyzed' }
    : { type: 'keyword' };
  let client;

  before(() => {
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      apiVersion
    });

    return client.indices.exists({ index: 'test' })
      .then(exists => exists && client.indices.delete({ index: 'test' }))
      .then(() => client.indices.create({
        index: 'test',
        body: {
          mappings: {
            people: {
              properties: {
                name: keywordMapping
              }
            },
            todos: {
              properties: {
                text: keywordMapping
              }
            }
          }
        }
      }))
      .then(() => {
        app.use(`/${serviceName}`, service({
          Model: client,
          events: ['testing'],
          id: 'id',
          elasticsearch: {
            index: 'test',
            type: 'people',
            refresh: true
          }
        }));
      });
  });

  after(() => client.indices.delete({ index: 'test' }));

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
    before(() => {
      return app.service(serviceName)
        .remove(null, { query: { $limit: 1000 } })
        .then(() => {
          return app.service(serviceName).create([
            {
              name: 'Bob',
              bio: 'I like JavaScript.'
            },
            {
              name: 'Moody',
              bio: 'I don\'t like .NET.'
            },
            {
              name: 'Douglas',
              bio: 'A legend'
            }
          ]);
        });
    });

    after(() => {
      app.service(serviceName).remove(null, { query: { $limit: 1000 } });
    });

    describe('find()', () => {
      it('should return empty array if no results found', () => {
        return app.service(serviceName)
          .find({ query: { id: 'better-luck-next-time' } })
          .then(results => {
            expect(results).to.be.an('array').and.be.empty;
          });
      });

      it('should return empty paginated results if no results found', () => {
        return app.service(serviceName)
          .find({
            query: { id: 'better-luck-next-time' },
            paginate: { default: 10 }
          })
          .then(results => {
            expect(results.total).to.equal(0);
            expect(results.data).to.be.an('array').and.be.empty;
          });
      });

      describe('special filters', () => {
        it('can $prefix', () => {
          return app.service(serviceName)
            .find({
              query: { name: { $prefix: 'B' } }
            })
            .then(results => {
              expect(results.length).to.equal(1);
              expect(results[0].name).to.equal('Bob');
            });
        });

        it('can $all', () => {
          return app.service(serviceName)
            .find({
              query: { $all: true }
            })
            .then(results => {
              expect(results.length).to.equal(3);
            });
        });

        it('can $match', () => {
          return app.service(serviceName)
            .find({
              query: { bio: { $match: 'I like JavaScript' } }
            })
            .then(results => {
              expect(results.length).to.equal(2);
            });
        });

        it('can $phrase', () => {
          return app.service(serviceName)
            .find({
              query: { bio: { $phrase: 'I like JavaScript' } }
            })
            .then(results => {
              expect(results.length).to.equal(1);
              expect(results[0].name).to.equal('Bob');
            });
        });

        it('can $phrase_prefix', () => {
          return app.service(serviceName)
            .find({
              query: { bio: { $phrase_prefix: 'I like JavaS' } }
            })
            .then(results => {
              expect(results.length).to.equal(1);
              expect(results[0].name).to.equal('Bob');
            });
        });
      });
    });

    describe('create()', () => {
      it('should support creating single element with provided id', () => {
        return app.service(serviceName)
          .create({ name: 'Bob', id: 'BobId' })
          .then(result => {
            expect(result.name).to.equal('Bob');
            expect(result.id).to.equal('BobId');

            return app.service(serviceName).get('BobId');
          })
          .then(result => {
            expect(result.name).to.equal('Bob');
          });
      });

      it('should throw Conflict when trying to create an element with existing id', () => {
        return app.service(serviceName)
          .create({ name: 'Bob', id: 'BobId' })
          .then(() => { throw new Error('Should never get here'); })
          .catch(error => {
            expect(error instanceof errors.Conflict).to.be.true;
          });
      });

      it('should support creating multiple elements with provided ids', () => {
        return app.service(serviceName)
          .create([
            { name: 'Cal', id: 'CalId' },
            { name: 'Max', id: 'MaxId' }
          ])
          .then(results => {
            expect(results[0].name).to.equal('Cal');
            expect(results[1].name).to.equal('Max');

            return app.service(serviceName).find({
              query: {
                id: { $in: ['CalId', 'MaxId'] }
              }
            });
          })
          .then(results => {
            expect(results[0].name).to.equal('Cal');
            expect(results[1].name).to.equal('Max');
          });
      });

      it('should return created items in the same order as requested ones along with the errors', () => {
        return app.service(serviceName)
          .create([
            { name: 'Catnis', id: 'CatnisId' },
            { name: 'Catnis', id: 'CatnisId' },
            { name: 'Mark', id: 'MarkId' }
          ])
          .then(results => {
            expect(results[0].name).to.equal('Catnis');
            expect(results[1]._meta.status).to.equal(409);
            expect(results[2].name).to.equal('Mark');
          });
      });
    });

    describe('patch()', () => {
      it('should return empty array if no items have been patched (bulk)', () => {
        return app.service(serviceName)
          .patch(
            null,
            { name: 'John' },
            { query: { id: 'better-luck-next-time' } }
          )
          .then(results => {
            expect(results).to.be.an('array').and.be.empty;
          });
      });
    });

    describe('remove()', () => {
      it('should return empty array if no items have been removed (bulk)', () => {
        return app.service(serviceName)
          .remove(
            null,
            { query: { id: 'better-luck-next-time' } }
          )
          .then(results => {
            expect(results).to.be.an('array').and.be.empty;
          });
      });
    });
  });

  describe('Elasticsearch service example test', () => {
    after(done => server.close(() => done()));

    // We test example app on the default id prop '_id' to check if it falls back correctly.
    example('_id');
  });
});
