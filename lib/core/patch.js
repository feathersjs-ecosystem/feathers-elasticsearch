'use strict';

const { getDocDescriptor, getQueryLength, mapPatch } = require('../utils');

function patch (service, id, data, params) {
  const { get } = service.core;
  let { filters, query } = service.filterQuery(params);
  let { routing } = getDocDescriptor(service, query);
  let { doc } = getDocDescriptor(service, data);
  let updateParams = Object.assign(
    {
      id: String(id),
      routing,
      body: { doc },
      _source: filters.$select
    },
    service.esParams
  );

  const queryPromise = getQueryLength(service, query) >= 1
    ? get(service, updateParams.id, params)
    : Promise.resolve();

  return queryPromise
    .then(() => service.Model.update(updateParams))
    .then(result => mapPatch(result, service.id, service.meta, service.join));
}

module.exports = patch;
