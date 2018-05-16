'use strict';

const errors = require('@feathersjs/errors');
const makeDebug = require('debug');
const Proto = require('uberproto');
const debug = makeDebug('feathers-elasticsearch');

const core = require('./core');

class Service {
  constructor (options) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided');
    }

    if (!options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided');
    }

    this.Model = options.Model;
    this.core = core(options.esVersion);
    this.paginate = options.paginate || {};
    this.events = options.events || [];
    this.id = options.id || '_id';
    this.parent = options.parent || '_parent';
    this.routing = options.routing || '_routing';
    this.meta = options.meta || '_meta';
    // `join` is Elasticsearch 6+ specific.
    this.join = options.join;
    this.esVersion = options.esVersion;
    this.esParams = Object.assign(
      { refresh: false },
      options.elasticsearch
    );
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  // GET
  find (params) {
    return this.core.find(this, params)
      .catch(errorHandler);
  }

  // GET
  get (id, params) {
    return this.core.get(this, id, params)
      .catch(error => errorHandler(error, id));
  }

  // POST
  // Supports single and bulk creation, with or without id specified.
  create (data, params) {
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
  update (id, data, params) {
    return this.core.update(this, id, data, params)
      .catch(error => errorHandler(error, id));
  }

  // PATCH
  // Supports single and bulk patching.
  patch (id, data, params) {
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
  remove (id, params) {
    if (id !== null) {
      return this.core.remove(this, id, params)
        .catch(error => errorHandler(error, id));
    }

    return this.core.removeBulk(this, params)
      .catch(errorHandler);
  }

  // Interface to leverage functionality provided in elasticsearchJS
  raw (method, params) {
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
