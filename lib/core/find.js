'use strict';

const { filter, parseQuery, mapFind } = require('../utils');

function find (service, params) {
  let paginate = params.paginate !== undefined ? params.paginate : service.paginate;
  let { filters, query } = filter(params.query, paginate);
  let esQuery = parseQuery(query, service.id);
  let findParams = Object.assign(
    {
      _source: filters.$select,
      from: filters.$skip,
      size: filters.$limit,
      sort: filters.$sort,
      body: {
        query: esQuery ? { bool: esQuery } : undefined
      }
    },
    service.esParams
  );

  // The `refresh` param is not recognised for search in Es.
  delete findParams.refresh;

  return service.Model.search(findParams)
    .then(result => mapFind(
      result,
      service.id,
      service.meta,
      service.join,
      filters,
      !!(paginate && paginate.default)
    ));
}

module.exports = find;
