'use strict';

const { removeProps, getDocDescriptor } = require('../../utils');
const get = require('../get');

function createCore (service, data, params, { getCreateParams }) {
  let docDescriptor = getDocDescriptor(service, data);
  let { id, routing } = docDescriptor;
  let createParams = getCreateParams(service, docDescriptor);
  let getParams = Object.assign(
    removeProps(params, 'query', 'upsert'),
    {
      query: Object.assign(
        { [service.routing]: routing },
        params.query
      )
    }
  );
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  let method = id !== undefined && !params.upsert ? 'create' : 'index';

  return service.Model[method](createParams)
    .then(result => get(service, result._id, getParams));
}

module.exports = createCore;
