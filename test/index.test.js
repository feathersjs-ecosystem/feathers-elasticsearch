/* eslint-env mocha */
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

  let client;

  before(() => {
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      apiVersion: '5.0'
    });

    return client.indices.exists({ index: 'test' })
      .then(exists => exists && client.indices.delete({ index: 'test' }))
      .then(() => client.indices.create({
        index: 'test',
        body: {
          mappings: {
            people: {
              properties: {
                name: {
                  type: 'keyword'
                }
              }
            },
            todos: {
              properties: {
                text: {
                  type: 'keyword'
                }
              }
            }
          }
        }
      }))
      .then(() => {
        app.use('/people', service({
          Model: client,
          events: ['testing'],
          params: {
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

  base(app, errors, 'people', '_id');

  describe('Elasticsearch service example test', () => {
    after(done => server.close(() => done()));

    example('_id');
  });
});

