'use strict';

const { removeProps } = require('../utils');
const get = require('./get');

function create (service, data, params) {
  let id = data[service.id];
  let parent = data[service.parent] ? String(data[service.parent]) : undefined;
  let hasId = undefined !== id;
  let createParams = Object.assign(
    {
      id: hasId ? String(id) : undefined,
      parent,
      body: removeProps(data, service.meta, service.id, service.parent)
    },
    service.esParams
  );
  let getParams = Object.assign(
    removeProps(params, 'query'),
    {
      query: Object.assign(
        { [service.parent]: parent },
        params.query
      )
    }
  );
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  let method = hasId ? 'create' : 'index';

  return service.Model[method](createParams)
    .then(result => get(service, result._id, getParams));
}

module.exports = create;
