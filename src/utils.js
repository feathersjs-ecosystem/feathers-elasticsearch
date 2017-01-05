'use strict';

import feathersFilter from 'feathers-query-filters';
import errors from 'feathers-errors';

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

  if (result.filters.$skip === undefined || isNaN(result.filters.$skip)) {
    result.filters.$skip = 0;
  }

  if (result.filters.$select === undefined) {
    result.filters.$select = true;
  }

  if (typeof result.filters.$sort === 'object') {
    result.filters.$sort = Object.keys(result.filters.$sort)
      .map(key => key + ':' + (result.filters.$sort[key] > 0 ? 'asc' : 'desc'));
  }

  return result;
}

export function mapFind (results, idProp, metaProp, filters, hasPagination) {
  let data = results.hits.hits
    .map(result => mapGet(result, idProp, metaProp));

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

export function mapGet (item, idProp, metaProp) {
  return mapItem(item, idProp, metaProp);
}

export function mapPatch (item, idProp, metaProp) {
  let normalizedItem = removeProps(item, 'get');

  normalizedItem._source = item.get._source;

  return mapItem(normalizedItem, idProp, metaProp);
}

function mapItem (item, idProp, metaProp) {
  let meta = removeProps(item, '_source');

  return Object.assign(
    {
      [metaProp]: meta,
      [idProp]: meta._id
    },
    item._source
  );
}

export function removeProps (object, ...props) {
  let result = Object.assign({}, object);

  props.forEach(prop => delete result[prop]);

  return result;
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
