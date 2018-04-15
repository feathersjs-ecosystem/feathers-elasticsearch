'use strict';

const { filter, removeProps } = require('../utils');
const get = require('./get');

function update (service, id, data, params) {
  let { query } = filter(params.query, service.paginate);
  let updateParams = Object.assign(
    {
      id: String(id),
      parent: query[service.parent],
      body: removeProps(data, service.meta, service.id)
    },
    service.esParams
  );
  let getParams = Object.assign(
    removeProps(params, 'query'),
    {
      query: Object.assign(
        { $select: false },
        params.query
      )
    }
  );

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  // TODO: add `allowUpsert` option which will allow upserts and allieviate the need for the first get.
  return get(service, id, getParams)
    .then(() => service.Model.index(updateParams))
    .then(result => get(service, result._id, params));
}

module.exports = update;
