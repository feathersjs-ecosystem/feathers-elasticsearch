'use strict';

const { removeProps, getDocDescriptor } = require('../../utils');

function updateCore (service, id, data, params, { getUpdateParams }) {
  const { get } = service.core;
  let { query } = service.filterQuery(params);
  let docDescriptor = getDocDescriptor(service, data, query, { [service.id]: id });
  let updateParams = getUpdateParams(service, docDescriptor);

  if (params.upsert) {
    return service.Model.index(updateParams)
      .then(result => get(service, result._id, removeProps(params, 'upsert')));
  }

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
  return get(service, id, getParams)
    .then(() => service.Model.index(updateParams))
    .then(result => get(service, result._id, params));
}

module.exports = updateCore;
