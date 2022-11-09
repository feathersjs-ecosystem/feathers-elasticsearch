import { removeProps, getDocDescriptor } from '../utils/index.js';

function getUpdateParams(service, docDescriptor) {
  const { id, routing, doc } = docDescriptor;

  return {
    id: String(id),
    routing,
    body: doc,
    ...service.esParams,
  };
}

export function update(service, id, data, params) {
  const { get } = service.core;
  const { query } = service.filterQuery(params);
  const docDescriptor = getDocDescriptor(service, data, query, {
    [service.id]: id,
  });
  const updateParams = getUpdateParams(service, docDescriptor);

  if (params.upsert) {
    return service.Model.index(updateParams).then((result) =>
      get(service, result._id, removeProps(params, 'upsert'))
    );
  }

  const getParams = Object.assign(removeProps(params, 'query'), {
    query: Object.assign({ $select: false }, params.query),
  });

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  return get(service, id, getParams)
    .then(() => service.Model.index(updateParams))
    .then((result) => get(service, result._id, params));
}
