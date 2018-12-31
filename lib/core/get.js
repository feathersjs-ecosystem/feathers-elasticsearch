'use strict';

const { mapGet, getDocDescriptor } = require('../utils');

function get (service, id, params) {
  let { filters, query } = service.filterQuery(params);
  let { routing } = getDocDescriptor(service, query);
  let getParams = Object.assign(
    {
      _source: filters.$select,
      id: String(id),
      routing
    },
    service.esParams
  );

  return service.Model.get(getParams)
    .then(result => mapGet(result, service.id, service.meta, service.join));
}

module.exports = get;
