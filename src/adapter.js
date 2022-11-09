// import { _ } from "@feathersjs/commons";
import { AdapterBase, filterQuery } from '@feathersjs/adapter-commons';

import { errors } from '@feathersjs/errors';
import { errorHandler } from './error-handler.js';
// const errors = require('@feathersjs/errors');
// const debug = makeDebug('feathers-elasticsearch');

import * as methods from './methods/index.js';

export class ElasticAdapter extends AdapterBase {
  constructor(options) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided');
    }

    if (!options || !options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided');
    }

    super({
      id: '_id',
      parent: '_parent',
      routing: '_routing',
      meta: '_meta',
      esParams: Object.assign({ refresh: false }, options.elasticsearch),
      ...options,
      filters: {
        ...options.filters,
        $routing: (val) => val,
      },
      operators: [
        ...(options.operators || []),
        '$prefix',
        '$wildcard',
        '$regexp',
        '$exists',
        '$missing',
        '$all',
        '$match',
        '$phrase',
        '$phrase_prefix',
        '$and',
        '$sqs',
        '$child',
        '$parent',
        '$nested',
        '$fields',
        '$path',
        '$type',
        '$query',
        '$operator',
        '$index',
      ],
    });

    // Alias getters for options
    ['Model', 'index', 'parent', 'meta', 'join', 'esVersion', 'esParams'].forEach((name) =>
      Object.defineProperty(this, name, {
        get() {
          return this.options[name];
        },
      })
    );
  }

  filterQuery(params = {}) {
    const options = this.getOptions(params);
    const { filters, query } = filterQuery(params?.query || {}, options);

    if (!filters.$skip || isNaN(filters.$skip)) {
      filters.$skip = 0;
    }

    if (typeof filters.$sort === 'object') {
      filters.$sort = Object.entries(filters.$sort).map(([key, val]) => ({
        [key]: val > 0 ? 'asc' : 'desc',
      }));
    }

    return { filters, query, paginate: options.paginate };
  }

  // GET
  _find(params = {}) {
    return methods.find(this, params).catch(errorHandler);
  }

  // GET
  _get(id, params = {}) {
    return methods.get(this, id, params).catch((error) => errorHandler(error, id));
  }

  // POST
  // Supports single and bulk creation, with or without id specified.
  _create(data, params = {}) {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return methods
        .create(this, data, params)
        .catch((error) => errorHandler(error, data[this.id]));
    }

    return methods.createBulk(this, data, params).catch(errorHandler);
  }

  // PUT
  // Supports single item update.
  _update(id, data, params = {}) {
    return methods.update(this, id, data, params).catch((error) => errorHandler(error, id));
  }

  // PATCH
  // Supports single and bulk patching.
  _patch(id, data, params = {}) {
    // Check if we are patching single item.
    if (id !== null) {
      return methods.patch(this, id, data, params).catch((error) => errorHandler(error, id));
    }

    return methods.patchBulk(this, data, params).catch(errorHandler);
  }

  // DELETE
  // Supports single and bulk removal.
  _remove(id, params = {}) {
    if (id !== null) {
      return methods.remove(this, id, params).catch((error) => errorHandler(error, id));
    }

    return methods.removeBulk(this, params).catch(errorHandler);
  }
}
