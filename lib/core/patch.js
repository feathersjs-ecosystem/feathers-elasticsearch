'use strict';

const { filter, removeProps } = require('../utils');
const get = require('./get');

function patch (service, id, data, params) {
  let { query } = filter(params.query, service.paginate);
  let updateParams = Object.assign(
    {
      id: String(id),
      parent: query[service.parent],
      body: {
        doc: removeProps(data, service.meta, service.id)
      },
      _source: false
    },
    service.esParams
  );

  return service.Model.update(updateParams)
    .then(() => get(service, id, params));
}

module.exports = patch;
