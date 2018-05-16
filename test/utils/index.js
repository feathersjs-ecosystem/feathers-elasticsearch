const { expect } = require('chai');

const {
  filter,
  mapFind,
  mapGet,
  mapPatch,
  mapBulk
} = require('../../lib/utils');

const parseQueryTests = require('./parse-query.js');
const coreUtilsTests = require('./core.js');

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

      expect(mapFind(sourceResults, '_id', '_meta', undefined, filters, true)).to
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
          age: 13,
          aka: {
            name: 'alias',
            parent: 1
          }
        },
        found: true
      };
    });

    it('should swap around meta and the doc', () => {
      let expectedResult = {
        name: 'John',
        age: 13,
        aka: {
          name: 'alias',
          parent: 1
        },
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

    it('should extract parent from join field when join prop provided', () => {
      let expectedResult = {
        name: 'John',
        age: 13,
        aka: 'alias',
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          found: true,
          _parent: 1
        }
      };

      expect(mapGet(item, '_id', '_meta', 'aka')).to
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
        { update: { result: 'updated', get: { _source: { name: 'Bob' } } } },
        {
          update: {
            result: 'updated',
            get: { _source: { name: 'Sunshine', aka: { name: 'alias', parent: '12' } } }
          }
        }
      ];
      let expectedResult = [
        { id: '12', _meta: { status: 409, _id: '12' } },
        { id: '13', _meta: { result: 'created', _id: '13' } },
        { _meta: { result: 'deleted' } },
        { _meta: { result: 'updated' }, name: 'Bob' },
        { _meta: { result: 'updated', _parent: '12' }, name: 'Sunshine', aka: 'alias' }
      ];

      expect(mapBulk(items, 'id', '_meta', 'aka')).to
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

  parseQueryTests();
  coreUtilsTests();
});
