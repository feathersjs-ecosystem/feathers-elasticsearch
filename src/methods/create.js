import { removeProps, getDocDescriptor } from '../utils/index.js';
import { get } from './get.js';

function getCreateParams(service, docDescriptor) {
  let { id, parent, routing, join, doc } = docDescriptor;

  if (join) {
    doc = Object.assign(
      {
        [service.join]: {
          name: join,
          parent,
        },
      },
      doc
    );
  }

  return Object.assign({ id, routing, body: doc }, service.esParams);
}

export function create(service, data, params) {
  const docDescriptor = getDocDescriptor(service, data);
  const { id, routing } = docDescriptor;
  const createParams = getCreateParams(service, docDescriptor);
  const getParams = Object.assign(removeProps(params, 'query', 'upsert'), {
    query: Object.assign({ [service.routing]: routing }, params.query),
  });
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  const method = id !== undefined && !params.upsert ? 'create' : 'index';

  return service.Model[method](createParams).then((result) => get(service, result._id, getParams));
}
