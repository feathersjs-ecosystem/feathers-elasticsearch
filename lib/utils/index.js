'use strict';

const { parseQuery } = require('./parse-query');
const {
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp
} = require('./core');

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
