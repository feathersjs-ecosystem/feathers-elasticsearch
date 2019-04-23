'use strict';

const { getDocDescriptor } = require('../utils');

function patch (service, id, data, params) {
  const { get } = service.core;
  let { query } = service.filterQuery(params);
  let { routing } = getDocDescriptor(service, query);
  let { doc } = getDocDescriptor(service, data);
  let updateParams = Object.assign(
    {
      id: String(id),
      routing,
      body: { doc },
      _source: false
    },
    service.esParams
  );

  return service.Model.update(updateParams)
    .then(() => get(service, id, params));
}

module.exports = patch;
