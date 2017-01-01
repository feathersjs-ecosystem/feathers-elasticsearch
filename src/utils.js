'use strict';

import feathersFilter from 'feathers-query-filters';
import merge from 'merge';

export function filter (query = {}, paginate = {}) {
  let result = feathersFilter(query, paginate);

  if (result.filters.$skip === undefined) {
    result.filters.$skip = 0;
  }
  // result.filters.$skip = Math.min(
  //   result.filters.$skip || 0,
  //   10000 - result.filters.$limit
  // );

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
  let keys;
  let filter = [];

  if (!query || typeof query !== 'object') {
    return null;
  }

  keys = Object.keys(query);

  if (!keys.length) {
    return null;
  }

  keys
    .filter(key => {
      let type = typeof query[key];

      return type === 'string' ||
        type === 'number' && !isNaN(query[key]) ||
        type === 'boolean';
    })
    .forEach(key => {
      filter.push({
        term: {
          [key]: query[key]
        }
      });
    });

  keys
    .filter(key => Array.isArray(query[key]) && query[key].length)
    .forEach(key => {
      filter.push({
        terms: {
          [key]: query[key]
        }
      });
    });

  if (!filter.length) {
    return null;
  }

  return {
    bool: { filter }
  };
}
