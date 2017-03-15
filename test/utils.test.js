/* eslint-env mocha */
import { expect } from 'chai';
import { filter, mapFind, mapGet, mapPatch, mapBulk, removeProps, parseQuery } from '../src/utils';
import { errors } from 'feathers-errors';

describe('Elasticsearch utils', () => {
  describe('filter', () => {
    let expectedResult;

    beforeEach(() => {
      expectedResult = {
        filters: {
          $sort: undefined,
          $limit: undefined,
          $skip: 0,
          $select: true,
          $populate: undefined
        },
        query: {}
      };
    });

    it('should return all filters if no parameters are defined', () => {
      expect(filter()).to
        .deep.equal(expectedResult);
    });

    it('should convert $sort object to Elasticsearch sort param', () => {
      expectedResult.filters.$sort = [ 'name:asc', 'age:desc' ];

      expect(filter({ $sort: { name: 1, age: -1 } })).to
        .deep.equal(expectedResult);
    });

    // TODO: fix the original feathers-query-filters, which checkes only for typeof === 'object'.
    // It can be an array or null.
    [ 'some random string', 23, undefined ]
      .forEach(sort => {
        it(`should pass through $sort if it is ${typeof sort} '${String(sort)}'`, () => {
          expectedResult.filters.$sort = sort;

          expect(filter({ $sort: sort })).to
            .deep.equal(expectedResult);
        });
      });

    [ 'some random string', 23, undefined ]
      .forEach(sort => {
        it(`should pass through $sort if it is ${typeof sort} e.g. '${JSON.stringify(sort)}'`, () => {
          expectedResult.filters.$sort = sort;

          expect(filter({ $sort: sort })).to
            .deep.equal(expectedResult);
        });
      });

    it('should return $skip 0 if $skip is not a number', () => {
      expectedResult.filters.$skip = 0;

      expect(filter({ $skip: 'abc' })).to
        .deep.equal(expectedResult);
    });

    it('should return $skip 0 if $skip is not NaN', () => {
      expectedResult.filters.$skip = 0;

      expect(filter({ $skip: NaN })).to
        .deep.equal(expectedResult);
    });

    [ 'some random string', 23, null, [], {} ]
      .forEach(select => {
        it(`should pass through $select if it ${typeof select} e.g. '${JSON.stringify(select)}'`, () => {
          expectedResult.filters.$select = select;

          expect(filter({ $select: select })).to
            .deep.equal(expectedResult);
        });
      });
  });

  describe('mapFind', () => {
    let sourceResults;
    let mappedResults;

    beforeEach(() => {
      sourceResults = {
        hits: {
          max_score: 0.677,
          total: 2,
          hits: [
            {
              _id: 12,
              _type: 'people',
              _source: {
                name: 'Andy'
              }
            },
            {
              _id: 15,
              _type: 'people',
              _source: {
                name: 'Duke'
              }
            }
          ]
        }
      };
      mappedResults = [
        {
          _id: 12,
          name: 'Andy',
          _meta: {
            _id: 12,
            _type: 'people'
          }
        },
        {
          _id: 15,
          name: 'Duke',
          _meta: {
            _id: 15,
            _type: 'people'
          }
        }
      ];
    });

    it('should swap around meta and the docs', () => {
      let expectedResult = mappedResults;

      expect(mapFind(sourceResults, '_id', '_meta')).to
        .deep.equal(expectedResult);
    });

    it('should returned paginated results when hasPagination is true', () => {
      let filters = {
        $skip: 10,
        $limit: 25
      };
      let expectedResult = {
        total: 2,
        skip: filters.$skip,
        limit: filters.$limit,
        data: mappedResults
      };

      expect(mapFind(sourceResults, '_id', '_meta', filters, true)).to
        .deep.equal(expectedResult);
    });
  });

  describe('mapGet', () => {
    let item;

    beforeEach(() => {
      item = {
        _id: 12,
        _type: 'people',
        _index: 'test',
        _source: {
          name: 'John',
          age: 13
        },
        found: true
      };
    });

    it('should swap around meta and the doc', () => {
      let expectedResult = {
        name: 'John',
        age: 13,
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          found: true
        }
      };

      expect(mapGet(item, '_id', '_meta')).to
        .deep.equal(expectedResult);
    });

    it('should not change the original item', () => {
      let itemSnapshot = JSON.stringify(item);

      mapGet(item, '_id', '_meta');
      expect(item).to.deep.equal(JSON.parse(itemSnapshot));
    });
  });

  describe('mapPatch', () => {
    let item;

    beforeEach(() => {
      item = {
        _id: 12,
        _type: 'people',
        _index: 'test',
        get: {
          _source: {
            name: 'John',
            age: 13
          },
          found: true
        },
        result: 'updated'
      };
    });

    it('should swap around meta and the doc', () => {
      let expectedResult = {
        _id: 12,
        name: 'John',
        age: 13,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          result: 'updated'
        }
      };

      expect(mapPatch(item, '_id', '_meta')).to
        .deep.equal(expectedResult);
    });

    it('should return just meta if patched document not present', () => {
      delete item.get;
      let expectedResult = {
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          result: 'updated'
        }
      };

      expect(mapPatch(item, '_id', '_meta')).to
        .deep.equal(expectedResult);
    });

    it('should not change the original item', () => {
      let itemSnapshot = JSON.stringify(item);

      mapPatch(item, '_id', '_meta');
      expect(item).to.deep.equal(JSON.parse(itemSnapshot));
    });
  });

  describe('mapBulk', () => {
    it('should get rid of action name property swap around meta and the doc', () => {
      let items = [
        { create: { status: 409, _id: '12' } },
        { index: { result: 'created', _id: '13' } },
        { delete: { result: 'deleted' } },
        { update: { result: 'updated', get: { _source: { name: 'Bob' } } } }
      ];
      let expectedResult = [
        { id: '12', _meta: { status: 409, _id: '12' } },
        { id: '13', _meta: { result: 'created', _id: '13' } },
        { _meta: { result: 'deleted' } },
        { _meta: { result: 'updated' }, name: 'Bob' }
      ];

      expect(mapBulk(items, 'id', '_meta')).to
        .deep.equal(expectedResult);
    });

    it('should not change original items', () => {
      let items = [
        { create: { status: 409, _id: '12' } }
      ];
      let itemsSnapshot = JSON.stringify(items);

      mapBulk(items, 'id', '_meta');
      expect(items).to.deep.equal(JSON.parse(itemsSnapshot));
    });
  });

  describe('removeProps', () => {
    let object;

    beforeEach(() => {
      object = {
        _id: 12,
        _meta: {
          _index: 'test'
        },
        age: 13
      };
    });

    it('should remove all properties from given list', () => {
      expect(removeProps(object, '_id', '_meta')).to
        .deep.equal({ age: 13 });
    });

    it('should not change the original object', () => {
      let objectSnapshot = JSON.stringify(object);

      removeProps(object);
      expect(JSON.stringify(object)).to
        .equal(objectSnapshot);
    });

    it('should work if some properties are not defined on the object', () => {
      expect(removeProps(object, '_meta', 'not_there')).to
        .deep.equal({ _id: 12, age: 13 });
    });

    it('should work if there are no props to remove', () => {
      expect(removeProps(object)).to
        .deep.equal(object);
    });
  });

  describe('parseQuery', () => {
    it('should return null if query is null or undefined', () => {
      expect(parseQuery(null, '_id')).to.be.null;
      expect(parseQuery()).to.be.null;
    });

    it('should return null if query has no own properties', () => {
      let query = Object.create({ hello: 'world' });

      expect(parseQuery({}, '_id')).to.be.null;
      expect(parseQuery(query, '_id')).to.be.null;
    });

    it('should throw BadRequest if query is not an object, null or undefined', () => {
      expect(() => parseQuery(12, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery(true, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery('abc', '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery([], '_id')).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $or is not an array', () => {
      expect(() => parseQuery({ $or: 12 }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: true }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: 'abc' }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: {} }, '_id')).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if criteria is not a primitive or an object', () => {
      expect(() => parseQuery({ age: null }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ age: [] }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ age: () => {} }, '_id')).to.throw(errors.BadRequest);
    });

    it('should return term query for each primitive param', () => {
      let query = {
        user: 'doug',
        age: 23,
        active: true
      };
      let expectedResult = {
        filter: [
          { term: { user: 'doug' } },
          { term: { age: 23 } },
          { term: { active: true } }
        ]
      };

      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should convert provided id property name to _id', () => {
      let query = { id: 12 };
      let expectedResult = {
        filter: [
          { term: { _id: 12 } }
        ]
      };
      expect(parseQuery(query, 'id')).to
        .deep.equal(expectedResult);
    });

    it('should return terms query for each $in param', () => {
      let query = {
        user: { $in: [ 'doug', 'bob' ] },
        age: { $in: [ 23, 24, 50 ] }
      };
      let expectedResult = {
        filter: [
          { terms: { user: [ 'doug', 'bob' ] } },
          { terms: { age: [ 23, 24, 50 ] } }
        ]
      };

      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return term and terms query together', () => {
      let query = {
        user: 'doug',
        age: { $in: [ 23, 24 ] }
      };
      let expectedResult = {
        filter: [
            { term: { user: 'doug' } },
            { terms: { age: [ 23, 24 ] } }
        ]
      };

      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return must_not terms query for each $nin param', () => {
      let query = {
        user: { $nin: [ 'doug', 'bob' ] },
        age: { $nin: [ 23, 24, 50 ] }
      };
      let expectedResult = {
        must_not: [
          { terms: { user: [ 'doug', 'bob' ] } },
          { terms: { age: [ 23, 24, 50 ] } }
        ]
      };

      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return range query for $lt, $lte, $gt, $gte', () => {
      let query = {
        age: { $gt: 30, $lt: 40 },
        likes: { $lte: 100 },
        cars: { $gte: 2, $lt: 5 }
      };
      let expectedResult = {
        filter: [
          { range: { age: { gt: 30 } } },
          { range: { age: { lt: 40 } } },
          { range: { likes: { lte: 100 } } },
          { range: { cars: { gte: 2 } } },
          { range: { cars: { lt: 5 } } }
        ]
      };
      expect(parseQuery(query, '_id')).to
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
              filter: [
                { term: { user: 'Adam' } },
                { range: { age: { gt: 40 } } }
              ]
            }
          },
          {
            bool: {
              filter: [
                { range: { age: { gt: 40 } } }
              ]
            }
          }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return "prefix" query for $prefix', () => {
      let query = {
        user: { $prefix: 'ada' }
      };
      let expectedResult = {
        filter: [
          { prefix: { user: 'ada' } }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return "match_all" query for $all: true', () => {
      let query = {
        $all: true
      };
      let expectedResult = {
        must: [
          { match_all: {} }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should not return "match_all" query for $all: false', () => {
      let query = {
        $all: false
      };
      let expectedResult = null;
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return "match" query for $match', () => {
      let query = {
        text: { $match: 'javascript' }
      };
      let expectedResult = {
        must: [
          { match: { text: 'javascript' } }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return "match_phrase" query for $phrase', () => {
      let query = {
        text: { $phrase: 'javascript' }
      };
      let expectedResult = {
        must: [
          { match_phrase: { text: 'javascript' } }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return "match_phrase_prefix" query for $phrase_prefix', () => {
      let query = {
        text: { $phrase_prefix: 'javasc' }
      };
      let expectedResult = {
        must: [
          { match_phrase_prefix: { text: 'javasc' } }
        ]
      };
      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });

    it('should return all types of queries together', () => {
      let query = {
        $or: [
          { likes: { $gt: 9, $lt: 12 }, age: { $ne: 10 } },
          { user: { $nin: [ 'Anakin', 'Luke' ] } },
          { user: { $prefix: 'ada' } },
          { $all: true }
        ],
        age: { $in: [ 12, 13 ] },
        user: 'Obi Wan',
        country: { $nin: [ 'us', 'pl', 'ae' ] },
        bio: { $match: 'javascript', $phrase: 'the good parts' }
      };
      let expectedResult = {
        should: [
          {
            bool: {
              filter: [
                { range: { likes: { gt: 9 } } },
                { range: { likes: { lt: 12 } } }
              ],
              'must_not': [
                { term: { age: 10 } }
              ]
            }
          },
          {
            bool: {
              must_not: [
                { terms: { user: [ 'Anakin', 'Luke' ] } }
              ]
            }
          },
          {
            bool: {
              filter: [
                { prefix: { user: 'ada' } }
              ]
            }
          },
          {
            bool: {
              must: [
                { match_all: {} }
              ]
            }
          }
        ],
        filter: [
          { terms: { age: [ 12, 13 ] } },
          { term: { user: 'Obi Wan' } }
        ],
        must_not: [
          { terms: { country: [ 'us', 'pl', 'ae' ] } }
        ],
        must: [
          { match: { bio: 'javascript' } },
          { match_phrase: { bio: 'the good parts' } }
        ]
      };

      expect(parseQuery(query, '_id')).to
        .deep.equal(expectedResult);
    });
  });
});
