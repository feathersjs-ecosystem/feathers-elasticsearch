/* eslint-env mocha */
import { expect } from 'chai';
import { parseQuery } from '../src/utils';

describe('Elasticsearch utils', () => {
  describe('parseQuery', () => {
    it('should return `null` if query is not an object', () => {
      expect(parseQuery()).to.be.null;
      expect(parseQuery(12)).to.be.null;
      expect(parseQuery('hello')).to.be.null;
      expect(parseQuery(true)).to.be.null;
    });

    it('should return `null` if query has no own properties', () => {
      let query = Object.create({ hello: 'world' });

      expect(parseQuery({})).to.be.null;
      expect(parseQuery(query)).to.be.null;
    });

    it('should return `null` if query properties are not string, number, boolean or array', () => {
      expect(parseQuery({
        object: {},
        nan: NaN,
        undefined: undefined,
        null: null
      })).to.be.null;
    });

    it('should return term query for each non-array param', () => {
      let query = {
        user: 'doug',
        age: 23,
        active: true
      };
      let expectedResult = {
        bool: {
          filter: [
            { term: { user: 'doug' } },
            { term: { age: 23 } },
            { term: { active: true } }
          ]
        }
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return terms query for each array param', () => {
      let query = {
        user: [ 'doug', 'bob' ],
        age: [ 23, 24, 50 ],
        active: [ true ]
      };
      let expectedResult = {
        bool: {
          filter: [
            { terms: { user: [ 'doug', 'bob' ] } },
            { terms: { age: [ 23, 24, 50 ] } },
            { terms: { active: [ true ] } }
          ]
        }
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return term and terms query together', () => {
      let query = {
        user: 'doug',
        age: [ 23, 24 ]
      };
      let expectedResult = {
        bool: {
          filter: [
            { term: { user: 'doug' } },
            { terms: { age: [ 23, 24 ] } }
          ]
        }
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });
  });
});
