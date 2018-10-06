'use strict';

const feathersFilter = require('@feathersjs/commons').filterQuery;

const { parseQuery, operators } = require('./parse-query');
const {
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp
} = require('./core');
const esOperators = operators.filter(operator =>
  feathersFilter.OPERATORS.indexOf(operator) === -1
);

function filter (query = {}, paginate = {}) {
  let result = feathersFilter(query, { paginate, operators: esOperators });

  if (result.filters.$skip === undefined || isNaN(result.filters.$skip)) {
    result.filters.$skip = 0;
  }

  if (result.filters.$select === undefined) {
    result.filters.$select = true;
  }

  if (typeof result.filters.$sort === 'object') {
    result.filters.$sort = Object.keys(result.filters.$sort)
      .map(key =>
        key + ':' + (result.filters.$sort[key] > 0 ? 'asc' : 'desc')
      );
  }

  return result;
}

function mapFind (results, idProp, metaProp, joinProp, filters, hasPagination) {
  let data = results.hits.hits
    .map(result => mapGet(result, idProp, metaProp, joinProp));

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

function mapGet (item, idProp, metaProp, joinProp) {
  return mapItem(item, idProp, metaProp, joinProp);
}

function mapPatch (item, idProp, metaProp, joinProp) {
  let normalizedItem = removeProps(item, 'get');

  normalizedItem._source = item.get && item.get._source;

  return mapItem(normalizedItem, idProp, metaProp, joinProp);
}

function mapBulk (items, idProp, metaProp, joinProp) {
  return items
    .map(item => {
      if (item.update) {
        return mapPatch(item.update, idProp, metaProp, joinProp);
      }

      return mapItem(
        item.create || item.index || item.delete,
        idProp,
        metaProp,
        joinProp
      );
    });
}

function mapItem (item, idProp, metaProp, joinProp) {
  let meta = removeProps(item, '_source');
  let result = Object.assign(
    { [metaProp]: meta },
    item._source
  );

  if (meta._id !== undefined) {
    result[idProp] = meta._id;
  }

  if (joinProp && result[joinProp] && typeof result[joinProp] === 'object') {
    let { parent, name } = result[joinProp];

    result[metaProp]._parent = parent;
    result[joinProp] = name;
  }

  return result;
}

module.exports = {
  filter,
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp,
  parseQuery,
  mapFind,
  mapGet,
  mapPatch,
  mapBulk
};
