'use strict';

const { filter } = require('../utils');
const get = require('./get');

function remove (service, id, params) {
  let { query } = filter(params.query, service.paginate);
  let removeParams = Object.assign(
    { id: String(id), parent: query[service.parent] },
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
