/* eslint-env mocha */
import { expect } from 'chai';
import { parseQuery } from '../src/utils';
import { errors } from 'feathers-errors';

describe('Elasticsearch utils', () => {
  describe('parseQuery', () => {
    it('should return null if query is null or undefined', () => {
      expect(parseQuery(null)).to.be.null;
      expect(parseQuery()).to.be.null;
    });

    it('should return null if query has no own properties', () => {
      let query = Object.create({ hello: 'world' });

      expect(parseQuery({})).to.be.null;
      expect(parseQuery(query)).to.be.null;
    });

    it('should throw BadRequest if query is not an object, null or undefined', () => {
      expect(() => parseQuery(12)).to.throw(errors.BadRequest);
      expect(() => parseQuery(true)).to.throw(errors.BadRequest);
      expect(() => parseQuery('abc')).to.throw(errors.BadRequest);
      expect(() => parseQuery([])).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $or is not an array', () => {
      expect(() => parseQuery({ $or: 12 })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: true })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: 'abc' })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: {} })).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if criteria is not a primitive or an object', () => {
      expect(() => parseQuery({ age: null })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ age: [] })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ age: () => {} })).to.throw(errors.BadRequest);
    });

    it('should return term query for each primitive param', () => {
      let query = {
        user: 'doug',
        age: 23,
        active: true
      };
      let expectedResult = {
        must: [
          { term: { user: 'doug' } },
          { term: { age: 23 } },
          { term: { active: true } }
        ]
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return terms query for each $in param', () => {
      let query = {
        user: { $in: [ 'doug', 'bob' ] },
        age: { $in: [ 23, 24, 50 ] }
      };
      let expectedResult = {
        must: [
          { terms: { user: [ 'doug', 'bob' ] } },
          { terms: { age: [ 23, 24, 50 ] } }
        ]
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return term and terms query together', () => {
      let query = {
        user: 'doug',
        age: { $in: [ 23, 24 ] }
      };
      let expectedResult = {
        must: [
            { term: { user: 'doug' } },
            { terms: { age: [ 23, 24 ] } }
        ]
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return range query for $lt, $lte, $gt, $gte', () => {
      let query = {
        age: { $gt: 30, $lt: 40 },
        likes: { $lte: 100 },
        cars: { $gte: 2, $lt: 5 }
      };
      let expectedResult = {
        must: [
          { range: { age: { gt: 30 } } },
          { range: { age: { lt: 40 } } },
          { range: { likes: { lte: 100 } } },
          { range: { cars: { gte: 2 } } },
          { range: { cars: { lt: 5 } } }
        ]
      };
      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });

    it('should return "should" subquery for $or', () => {
      let query = {
        $or: [
          { user: 'Adam', age: { $gt: 40 } },
          { age: { $gt: 40 } }
        ]
      };
      let expectedResult = {
        should: [
          {
            bool: {
              must: [
                { term: { user: 'Adam' } },
                { range: { age: { gt: 40 } } }
              ]
            }
          },
          {
            bool: {
              must: [
                { range: { age: { gt: 40 } } }
              ]
            }
          }
        ]
      };

      expect(parseQuery(query)).to
        .deep.equal(expectedResult);
    });
  });
});
