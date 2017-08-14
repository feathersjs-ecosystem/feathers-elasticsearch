'use strict';

import errors from 'feathers-errors';
import makeDebug from 'debug';

import { filter, removeProps, parseQuery, mapGet, mapFind, mapBulk } from './utils';
import Proto from 'uberproto';

const debug = makeDebug('feathers-elasticsearch');

class Service {
  constructor (options) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided');
    }

    if (!options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided');
    }

    this.Model = options.Model;
    this.paginate = options.paginate || {};
    this.events = options.events || [];
    this.id = options.id || '_id';
    this.parent = options.parent || '_parent';
    this.meta = options.meta || '_meta';
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
    return find(this, params)
      .catch(errorHandler);
  }

  // GET
  get (id, params) {
    return get(this, id, params)
      .catch(error => errorHandler(error, id));
  }

  // POST
  // Supports single and bulk creation, with or without id specified.
  create (data, params) {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return create(this, data, params)
        .catch(error => errorHandler(error, data[this.id]));
    }

    return createBulk(this, data, params)
      .catch(errorHandler);
  }

  // PUT
  // Supports single item update.
  update (id, data, params) {
    let { query } = filter(params.query, this.paginate);
    let updateParams = Object.assign(
      {
        id: String(id),
        parent: query[this.parent],
        body: removeProps(data, this.meta, this.id)
      },
      this.esParams
    );
    let getParams = Object.assign(
      removeProps(params, 'query'),
      {
        query: Object.assign(
          { $select: false },
          params.query
        )
      }
    );

    // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
    // TODO: add `allowUpsert` option which will allow upserts and allieviate the need for the first get.
    return get(this, id, getParams)
      .then(() => this.Model.index(updateParams))
      .then(result => get(this, result._id, params))
      .catch(error => errorHandler(error, id));
  }

  // PATCH
  // Supports single and bulk patching.
  patch (id, data, params) {
    // Check if we are patching single item.
    if (id !== null) {
      return patch(this, id, data, params)
        .catch(error => errorHandler(error, id));
    }

    return patchBulk(this, data, params)
      .catch(errorHandler);
  }

  // DELETE
  // Supports single and bulk removal.
  remove (id, params) {
    if (id !== null) {
      return remove(this, id, params)
        .catch(error => errorHandler(error, id));
    }

    return removeBulk(this, params)
      .catch(errorHandler);
  }

  // Interface to leverage functionality provided in elasticsearchJS
  raw (method, params) {
    if(typeof method === 'undefined') {
      return Promise
        .reject(new Error('params.method must be defined.'))
        .catch(errorHandler);
    }

    return raw(this, method, params)
      .catch(errorHandler);
  }
}

function raw (service, method, params) {
  // handle client methods like indices.create
  const [primaryMethod, secondaryMethod] = method.split('.');

  if (typeof service.Model[primaryMethod] === 'undefined') {
    return Promise
      .reject(new Error(`There is no query method ${primaryMethod}.`));
  } else if (
    secondaryMethod &&
    typeof service.Model[primaryMethod][secondaryMethod] === 'undefined'
  ) {
    return Promise
      .reject(new Error(`There is no query method ${primaryMethod}.${secondaryMethod}.`));
  }

  return (typeof service.Model[primaryMethod][secondaryMethod] === 'function')
    ? service.Model[primaryMethod][secondaryMethod](params)
    : service.Model[primaryMethod](params);
}

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
      filters,
      !!(paginate && paginate.default)
    ));
}

function get (service, id, params) {
  let { filters, query } = filter(params.query, service.paginate);
  let parent = query[service.parent];
  let getParams = Object.assign(
    {
      _source: filters.$select,
      id: String(id),
      parent: parent ? String(parent) : undefined
    },
    service.esParams
  );

  return service.Model.get(getParams)
    .then(result => mapGet(result, service.id, service.meta));
}

function mget (service, docs, params) {
  let { filters } = filter(params.query, service.paginate);
  let mgetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs }
    },
    service.esParams
  );

  return service.Model.mget(mgetParams)
    .then(fetched => fetched.docs.map(item => mapGet(item, service.id, service.meta)));
}

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

function createBulk (service, data, params) {
  let bulkCreateParams = Object.assign(
    {
      // Elasticsearch bulk API takes two objects per index or create operation.
      // First is the action descriptor, the second is usually the data.
      // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
      // reduce() here is acting as a map() mapping one element into two.
      body: data.reduce((result, item) => {
        let id = item[service.id];

        if (id !== undefined) {
          result.push({ create: { _id: id, parent: item[service.parent] } });
        } else {
          result.push({ index: { parent: item[service.parent] } });
        }
        result.push(removeProps(item, service.meta, service.id, service.parent));

        return result;
      }, [])
    },
    service.esParams
  );

  return service.Model.bulk(bulkCreateParams)
    .then(results => {
      let created = mapBulk(results.items, service.id, service.meta);
      // We are fetching only items which have been correctly created.
      let docs = created
        .map((item, index) => Object.assign(
          { [service.parent]: data[index][service.parent] },
          item
        ))
        .filter(item => item[service.meta].status === 201)
        .map(item => ({
          _id: item[service.meta]._id,
          parent: item[service.parent]
        }));

      return mget(service, docs, params)
        .then(fetched => {
          let fetchedIndex = 0;

          // We need to return responses for all items, either success or failure,
          // in the same order as the request.
          return created.map(createdItem => {
            if (createdItem[service.meta].status === 201) {
              let fetchedItem = fetched[fetchedIndex];

              fetchedIndex += 1;

              return fetchedItem;
            }

            return createdItem;
          });
        });
    });
}

function patch (service, id, data, params) {
  let { query } = filter(params.query, service.paginate);
  let updateParams = Object.assign(
    {
      id: String(id),
      parent: query[service.parent],
      body: {
        doc: removeProps(data, service.meta, service.id)
      },
      _source: false
    },
    service.esParams
  );

  return service.Model.update(updateParams)
    .then(() => get(service, id, params));
}

function patchBulk (service, data, params) {
  // Poor man's semi-deep object extension. We only want to override params.query.$select here.
  let findParams = Object.assign(
    removeProps(params, 'query'),
    {
      query: Object.assign(
        {},
        params.query,
        { $select: false }
      )
    }
  );

  // Elasticsearch provides update by query, which is quite sadly somewhat unfit for our purpose here.
  // Hence the find / bulk-update duo. We need to be aware, that the pagination rules apply here,
  // therefore the update will be perform on max items at any time (Es default is 5).
  return find(service, findParams)
    .then(results => {
      // The results might be paginated.
      let found = Array.isArray(results) ? results : results.data;
      let bulkUpdateParams;

      if (!found.length) {
        return found;
      }
      bulkUpdateParams = Object.assign(
        {
          _source: false,
          body: found.reduce((result, item) => {
            result.push({ update: { _id: item[service.id], parent: item[service.meta]._parent } });
            result.push({ doc: removeProps(data, service.meta, service.id) });

            return result;
          }, [])
        },
        service.esParams
      );

      return service.Model.bulk(bulkUpdateParams)
        .then(result => {
          let patched = mapBulk(result.items, service.id, service.meta);
          let docs = patched
            .map((item, index) => Object.assign(
              { [service.parent]: found[index][service.meta]._parent },
              item
            ))
            .filter(item => item[service.meta].status === 200)
            .map(item => ({
              _id: item[service.meta]._id,
              parent: item[service.parent]
            }));

          return mget(service, docs, params)
            .then(fetched => {
              let fetchedIndex = 0;

              return patched.map(patchedItem => {
                if (patchedItem[service.meta].status === 200) {
                  let fetchedItem = fetched[fetchedIndex];

                  fetchedIndex += 1;

                  return fetchedItem;
                }

                return patchedItem;
              });
            });
        });
    });
}

function remove (service, id, params) {
  let { query } = filter(params.query, service.paginate);
  let removeParams = Object.assign(
    { id: String(id), parent: query[service.parent] },
    service.esParams
  );

  return get(service, id, params)
    .then(result =>
      service.Model
        .delete(removeParams)
        .then(() => result)
    );
}

function removeBulk (service, params) {
  return find(service, params)
    .then(results => {
      let found = Array.isArray(results) ? results : results.data;
      let bulkRemoveParams;

      if (!found.length) {
        return found;
      }

      bulkRemoveParams = Object.assign(
        {
          body: found.map(item => ({
            delete: { _id: item[service.id], parent: item[service.meta]._parent }
          }))
        },
        service.esParams
      );

      return service.Model.bulk(bulkRemoveParams)
        .then(results => results.items
          .map((item, index) => item.delete.status === 200 ? found[index] : false)
          .filter(item => !!item)
        );
    });
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

export default function init (options) {
  debug('Initializing feathers-elasticsearch plugin');
  return new Service(options);
}

init.Service = Service;
