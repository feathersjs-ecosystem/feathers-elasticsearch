'use strict';

const errors = require('@feathersjs/errors');
const { AdapterService } = require('@feathersjs/adapter-commons');
const makeDebug = require('debug');
const debug = makeDebug('feathers-elasticsearch');

const core = require('./core');

class Service extends AdapterService {
  constructor (options) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided');
    }

    if (!options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided');
    }

    super(Object.assign({
      id: '_id',
      parent: '_parent',
      routing: '_routing',
      meta: '_meta',
      esParams: Object.assign(
        { refresh: false },
        options.elasticsearch
      )
    }, options));

    // Alias getters for options
    [ 'Model', 'parent', 'routing', 'meta', 'join', 'esVersion', 'esParams' ].forEach(name =>
      Object.defineProperty(this, name, {
        get () {
          return this.options[name];
        }
      })
    );

    this.core = core(options.esVersion);
  }

  filterQuery (params = {}) {
    let result = super.filterQuery(params);

    if (result.filters.$skip === undefined || isNaN(result.filters.$skip)) {
      result.filters.$skip = 0;
    }

    if (result.filters.$select === undefined) {
      result.filters.$select = true;
    }

    if (typeof result.filters.$sort === 'object') {
      result.filters.$sort = Object.keys(result.filters.$sort)
        .map(key =>
          key + ':' + (result.filters.$sort[key] > 0 ? 'asc' : 'desc')
        );
    }

    return result;
  }

  // GET
  _find (params = {}) {
    return this.core.find(this, params)
      .catch(errorHandler);
  }

  // GET
  _get (id, params = {}) {
    return this.core.get(this, id, params)
      .catch(error => errorHandler(error, id));
  }

  // POST
  // Supports single and bulk creation, with or without id specified.
  _create (data, params = {}) {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return this.core.create(this, data, params)
        .catch(error => errorHandler(error, data[this.id]));
    }

    return this.core.createBulk(this, data, params)
      .catch(errorHandler);
  }

  // PUT
  // Supports single item update.
  _update (id, data, params = {}) {
    return this.core.update(this, id, data, params)
      .catch(error => errorHandler(error, id));
  }

  // PATCH
  // Supports single and bulk patching.
  _patch (id, data, params = {}) {
    // Check if we are patching single item.
    if (id !== null) {
      return this.core.patch(this, id, data, params)
        .catch(error => errorHandler(error, id));
    }

    return this.core.patchBulk(this, data, params)
      .catch(errorHandler);
  }

  // DELETE
  // Supports single and bulk removal.
  _remove (id, params = {}) {
    if (id !== null) {
      return this.core.remove(this, id, params)
        .catch(error => errorHandler(error, id));
    }

    return this.core.removeBulk(this, params)
      .catch(errorHandler);
  }

  // Interface to leverage functionality provided in elasticsearchJS
  raw (method, params = {}) {
    if (typeof method === 'undefined') {
      return Promise
        .reject(errors.MethodNotAllowed('params.method must be defined.'))
        .catch(errorHandler);
    }

    return this.core.raw(this, method, params)
      .catch(errorHandler);
  }
}

function errorHandler (error, id) {
  let statusCode = error.statusCode;

  if (statusCode === 404 && id !== undefined) {
    throw new errors.NotFound(`No record found for id '${id}'`);
  }

  if (errors[statusCode]) {
    throw new errors[statusCode](error.message, error);
  }

  throw new errors.GeneralError(error.message, error);
}

module.exports = function init (options) {
  debug('Initializing feathers-elasticsearch plugin');
  return new Service(options);
};

module.exports.Service = Service;
