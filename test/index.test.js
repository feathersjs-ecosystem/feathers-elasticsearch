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
                name: keywordMapping,
                tags: keywordMapping
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
        app.use('/mobiles', service({
          Model: client,
          id: 'id',
          parent: 'parent',
          elasticsearch: {
            index: 'test',
            type: 'mobiles',
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
    before(() => app.service(serviceName)
      .remove(null, { query: { $limit: 1000 } })
      .then(() => app.service(serviceName)
        .create([
          {
            id: 'bob',
            name: 'Bob',
            bio: 'I like JavaScript.',
            tags: ['javascript', 'programmer']
          },
          {
            id: 'moody',
            name: 'Moody',
            bio: 'I don\'t like .NET.',
            tags: ['programmer']
          },
          {
            id: 'douglas',
            name: 'Douglas',
            bio: 'A legend',
            tags: ['javascript', 'legend', 'programmer']
          }
        ])
      )
      .then(() => app.service('mobiles')
        .create([
          { number: '991', parent: 'douglas' },
          { number: '992', parent: 'douglas' },
          { number: '991', parent: 'moody' }
        ])
      )
    );

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

      it('should filter results by array parameter', () => {
        return app.service(serviceName)
          .find({
            query: { tags: ['legend', 'javascript'] }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Douglas');
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

        it('can $or correctly with other filters', () => {
          return app.service(serviceName)
            .find({
              query: {
                $or: [
                  { name: 'Moody' },
                  { name: 'Douglas' }
                ],
                bio: { $match: 'JavaScript legend' }
              }
            })
            .then(results => {
              expect(results.length).to.equal(1);
              expect(results[0].name).to.equal('Douglas');
            });
        });

        it('can $and', () => {
          return app.service(serviceName)
            .find({
              query: {
                $sort: { name: 1 },
                $and: [
                  { tags: 'javascript' },
                  { tags: 'programmer' }
                ]
              }
            })
            .then(results => {
              expect(results.length).to.equal(2);
              expect(results[0].name).to.equal('Bob');
              expect(results[1].name).to.equal('Douglas');
            });
        });

        it('can $child', () => {
          return app.service(serviceName)
            .find({
              query: {
                $sort: { name: 1 },
                $child: {
                  $type: 'mobiles',
                  number: '991'
                }
              }
            })
            .then(results => {
              expect(results.length).to.equal(2);
              expect(results[0].name).to.equal('Douglas');
              expect(results[1].name).to.equal('Moody');
            });
        });

        it('can $parent', () => {
          return app.service('mobiles')
            .find({
              query: {
                $sort: { number: 1 },
                $parent: {
                  $type: 'people',
                  name: 'Douglas'
                }
              }
            })
            .then(results => {
              expect(results.length).to.equal(2);
              expect(results[0].number).to.equal('991');
              expect(results[1].number).to.equal('992');
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

      it('should create single item with provided parent', () => {
        return app.service('mobiles')
          .create({ number: '0123456789', parent: 'bob' })
          .then(result => {
            expect(result.number).to.equal('0123456789');
            expect(result._meta._parent).to.equal('bob');
          });
      });

      it('should create multiple items with provided parents', () => {
        return app.service('mobiles')
          .create([
            { number: '0123', parent: 'bob', id: 'bobMobile' },
            { number: '1234', parent: 'moody' }
          ])
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].number).to.equal('0123');
            expect(results[0]._meta._parent).to.equal('bob');
            expect(results[1].number).to.equal('1234');
            expect(results[1]._meta._parent).to.equal('moody');
          });
      });
    });

    describe('get()', () => {
      it('should get an item with specified parent', () => {
        return app.service('mobiles')
          .get('bobMobile', { query: { parent: 'bob' } })
          .then(result => {
            expect(result.number).to.equal('0123');
          });
      });
    });

    describe('update()', () => {
      it('should update an item with specified parent', () => {
        return app.service('mobiles')
          .update(
            'bobMobile',
            { number: '123' },
            { query: { parent: 'bob' } }
          )
          .then(result => {
            expect(result.number).to.equal('123');
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

      it('should patch an item with a specified parent', () => {
        return app.service('mobiles')
          .patch(
            'bobMobile',
            { number: '321' },
            { query: { parent: 'bob' } }
          )
          .then(result => {
            expect(result.number).to.equal('321');
          });
      });

      it('should patch items which have parents (bulk)', () => {
        return app.service('mobiles')
          .create([
            { number: 'patchme', parent: 'bob' },
            { number: 'patchme', parent: 'moody' }
          ])
          .then(() => app.service('mobiles')
            .patch(
              null,
              { number: 'patched' },
              { query: { number: 'patchme' } }
            )
          )
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].number).to.equal('patched');
            expect(results[1].number).to.equal('patched');
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

      it('should remove an item with a specified parent', () => {
        return app.service('mobiles')
          .remove('bobMobile', { query: { parent: 'bob' } })
          .then(result => {
            expect(result.number).to.equal('321');
          });
      });

      it('should remove items which have a parent', () => {
        return app.service('mobiles')
          .create([
            { number: 'removeme', parent: 'bob' },
            { number: 'removeme', parent: 'moody' }
          ])
          .then(() => app.service('mobiles')
            .remove(
              null,
              { query: { number: 'removeme', $sort: { _parent: 1 } } }
            )
          )
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].number).to.equal('removeme');
            expect(results[0]._meta._parent).to.equal('bob');
            expect(results[1].number).to.equal('removeme');
            expect(results[1]._meta._parent).to.equal('moody');
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
