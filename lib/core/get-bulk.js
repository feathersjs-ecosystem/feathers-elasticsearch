'use strict';

const { mapGet } = require('../utils');

function getBulk (service, docs, params) {
  let { filters } = service.filterQuery(params);
  let bulkGetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs }
    },
    service.esParams
  );

  return service.Model.mget(bulkGetParams)
    .then(fetched => fetched.docs.map(item =>
      mapGet(item, service.id, service.meta, service.join))
    );
}

module.exports = getBulk;
