'use strict';

import { parseQuery, mapFind } from '../utils/index.js';

export function find(service, params) {
  const { filters, query, paginate } = service.filterQuery(params);
  const esQuery = parseQuery(query, service.id);
  const findParams = {
    index: filters.$index ?? service.index,
    from: filters.$skip,
    size: filters.$limit,
    sort: filters.$sort,
    routing: filters.$routing,
    query: esQuery ? { bool: esQuery } : undefined,
    ...service.esParams,
  };

  console.dir(findParams, { depth: null });

  // The `refresh` param is not recognised for search in Es.
  delete findParams.refresh;

  return service.Model.search(findParams).then((result) =>
    mapFind(
      result,
      service.id,
      service.meta,
      service.join,
      filters,
      !!(paginate && paginate.default)
    )
  );
}
