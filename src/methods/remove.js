'use strict';

import { getDocDescriptor } from '../utils/index.js';

export function remove(service, id, params) {
  const { get } = service.core;
  const { query } = service.filterQuery(params);
  const { routing } = getDocDescriptor(service, query);
  const removeParams = Object.assign({ id: String(id), routing }, service.esParams);

  return get(service, id, params).then((result) =>
    service.Model.delete(removeParams).then(() => result)
  );
}
