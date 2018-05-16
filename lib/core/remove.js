'use strict';

const { filter, getDocDescriptor } = require('../utils');

function remove (service, id, params) {
  const { get } = service.core;
  let { query } = filter(params.query, service.paginate);
  let { routing } = getDocDescriptor(service, query);
  let removeParams = Object.assign(
    { id: String(id), routing },
    service.esParams
  );

  return get(service, id, params)
    .then(result =>
      service.Model
        .delete(removeParams)
        .then(() => result)
    );
}

module.exports = remove;
