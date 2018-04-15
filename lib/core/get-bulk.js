'use strict';

const { filter, mapGet } = require('../utils');

function getBulk (service, docs, params) {
  let { filters } = filter(params.query, service.paginate);
  let bulkGetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs }
    },
    service.esParams
  );

  return service.Model.mget(bulkGetParams)
    .then(fetched => fetched.docs.map(item => mapGet(item, service.id, service.meta)));
}

module.exports = getBulk;
