'use strict';

const { filter, mapGet } = require('../utils');

function get (service, id, params) {
  let { filters, query } = filter(params.query, service.paginate);
  let parent = query[service.parent];
  let getParams = Object.assign(
    {
      _source: filters.$select,
      id: String(id),
      parent: parent ? String(parent) : undefined
    },
    service.esParams
  );

  return service.Model.get(getParams)
    .then(result => mapGet(result, service.id, service.meta));
}

module.exports = get;
