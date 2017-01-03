'use strict';

import feathersFilter from 'feathers-query-filters';
import errors from 'feathers-errors';
import merge from 'merge';

const queryCriteriaMap = {
  $nin: 'must_not.terms',
  $in: 'must.terms',
  $gt: 'must.range.gt',
  $gte: 'must.range.gte',
  $lt: 'must.range.lt',
  $lte: 'must.range.lte',
  $ne: 'must_not.term'
};

export function filter (query = {}, paginate = {}) {
  let result = feathersFilter(query, paginate);

  if (result.filters.$skip === undefined) {
    result.filters.$skip = 0;
  }

  if (result.filters.$select === undefined) {
    result.filters.$select = true;
  }

  return result;
}

export function mapFind (results, idProp, metaPrefix, filters, hasPagination) {
  let data = results.hits.hits.map(result => mapGet(result, idProp, metaPrefix));

  if (hasPagination) {
    return {
      total: results.hits.total,
      skip: filters.$skip,
      limit: filters.$limit,
      data
    };
  }

  return data;
}

export function mapGet (result, idProp, metaPrefix) {
  return merge(
    true,
    result._source,
    {
      [idProp]: result._id,
      [metaPrefix + 'type']: result._type
    }
  );
}

export function mapUpdate (result, idProp, metaPrefix) {
  return merge(
    true,
    result._source,
    {
      [idProp]: result._id,
      [metaPrefix + 'type']: result._type
    }
  );
}

export function mapPatch (result, idProp, metaPrefix) {
  return merge(
    true,
    result.get._source,
    {
      [idProp]: result._id,
      [metaPrefix + 'type']: result._type
    }
  );
}

export function trimMeta (data, prefix) {
  return Object.keys(data)
    .filter(key => key.indexOf(prefix) !== 0)
    .reduce((result, key) => {
      result[key] = data[key];

      return result;
    }, {});
}

export function parseQuery (query) {
  let bool;

  if (query === null || query === undefined) {
    return null;
  }

  if (typeof query !== 'object' || Array.isArray(query)) {
    throw new errors.BadRequest('query should be an object, null or undefined');
  }

  bool = Object.keys(query)
    .reduce((result, key) => {
      let value = query[key];
      let isArray = Array.isArray(value);
      let type = typeof value;

      // The key is $or, meaning we are dealing with subqueries.
      // We need to add subqueries to should[].
      if (key === '$or') {
        if (!isArray) {
          throw new errors.BadRequest('$or should be an array');
        }

        if (!result.should) {
          result.should = [];
        }
        result.should.push(...value
          .map(subQuery => parseQuery(subQuery))
          .filter(parsed => !!parsed)
          .map(parsed => ({ bool: parsed }))
        );

        return result;
      }

      // The value is not an object, which means it's supposed to be a primitive.
      // We need add simple must[{term: {}}] query.
      if (value === null || typeof value !== 'object') {
        if (type !== 'number' && type !== 'string' && type !== 'undefined' && type !== 'boolean') {
          throw new errors.BadRequest(`criteria should be an object or a primitive: ${key} is array`);
        }

        if (!result.must) {
          result.must = [];
        }
        result.must.push({ term: { [key]: value } });

        return result;
      // In this case the key is not $or and value is an object,
      // so we are most probably dealing with criteria.
      } else {
        if (isArray) {
          throw new errors.BadRequest(`criteria should be an object or a primitive: ${key} is array`);
        }

        Object.keys(value)
          .filter(criterion => queryCriteriaMap[criterion])
          .forEach(criterion => {
            let [ section, term, operand ] = queryCriteriaMap[criterion].split('.');

            if (!result[section]) {
              result[section] = [];
            }

            result[section].push({
              [term]: {
                [key]: operand
                  ? { [operand]: value[criterion] }
                  : value[criterion]
              }
            });
          });

        return result;
      }
    }, {});

  if (!Object.keys(bool).length) {
    return null;
  }

  return bool;
}
