'use strict';

const feathersFilter = require('@feathersjs/commons').filterQuery;

const { removeProps } = require('./core');
const { parseQuery } = require('./parse-query');

function filter (query = {}, paginate = {}) {
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

function mapFind (results, idProp, metaProp, filters, hasPagination) {
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

function mapGet (item, idProp, metaProp) {
  return mapItem(item, idProp, metaProp);
}

function mapPatch (item, idProp, metaProp) {
  let normalizedItem = removeProps(item, 'get');

  normalizedItem._source = item.get && item.get._source;

  return mapItem(normalizedItem, idProp, metaProp);
}

function mapBulk (items, idProp, metaProp) {
  return items
    .map(item => {
      if (item.update) {
        return mapPatch(item.update, idProp, metaProp);
      }

      return mapItem(item.create || item.index || item.delete, idProp, metaProp);
    });
}

function mapItem (item, idProp, metaProp) {
  let meta = removeProps(item, '_source');
  let result = meta._id === undefined ? {} : { [idProp]: meta._id };

  return Object.assign(
    result,
    { [metaProp]: meta },
    item._source
  );
}

module.exports = {
  filter,
  removeProps,
  parseQuery,
  mapFind,
  mapGet,
  mapPatch,
  mapBulk
};
