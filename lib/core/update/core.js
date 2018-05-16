'use strict';

const { filter, removeProps, getDocDescriptor } = require('../../utils');

function updateCore (service, id, data, params, { getUpdateParams }) {
  const { get } = service.core;
  let { query } = filter(params.query, service.paginate);
  let docDescriptor = getDocDescriptor(service, data, query);
  let updateParams = getUpdateParams(service, docDescriptor);
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

module.exports = updateCore;
