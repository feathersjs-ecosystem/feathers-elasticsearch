import errors from 'feathers-errors';
import makeDebug from 'debug';
import { filter, mapGet, mapFind, mapPatch, trimMeta, parseQuery } from './utils';
import merge from 'merge';
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
    this.params = options.params || {};
    this.events = options.events || [];
    this.paginate = options.paginate || {};
    this.metaPrefix = options.metaPrefix || '_';
    this.id = options.id || '_id';
  }

  extend (obj) {
    return Proto.extend(obj, this);
  }

  // GET
  find (params) {
    return find(this, params)
      .then(results => {
        return results;
      });
  }

  // GET
  get (id, params) {
    return get(this, id, params)
      .catch(error => errorHandler(error, id));
  }

  // POST
  create (data, params) {
    let id = data[this.id];
    let hasId = undefined !== id;
    let createParams = merge(true, this.params, { body: data });
    // Elasticsearch `create` expects _id, whereas index does not.
    let method = hasId ? 'create' : 'index';

    if (hasId) {
      delete createParams.body[this.id];
      createParams._id = String(id);
    }

    return this.Model[method](createParams)
      .then(result => get(this, result._id, params))
      .catch(error => errorHandler(error, id));
  }

  // PUT
  update (id, data, params) {
    let updateParams = merge(
      true,
      this.params,
      {
        id: String(id),
        body: trimMeta(data, this.metaPrefix)
      }
    );

    return this.Model.index(updateParams)
      .then(result => get(this, result._id, params))
      .catch(error => errorHandler(error, id));
  }

  // PATCH
  patch (id, data, params) {
    let { filters } = filter(params.query, this.paginate);
    let patchParams = merge(
      true,
      this.params,
      {
        id: String(id),
        body: {
          doc: trimMeta(data, this.metaPrefix)
        },
        _source: filters.$select || true
      }
    );

    // The `get` here is just to throw 404 if the document does not exist.
    // Elasticsearch does upsert, normally.
    return get(this, id, params)
      .then(() => this.Model.update(patchParams))
      .catch(error => errorHandler(error, id))
      .then(result => mapPatch(result, this.id, this.metaPrefix));
  }

  // DELETE
  remove (id, params) {
    if (id !== null) {
      let removeParams = merge(true, this.params, { id: String(id) });

      return get(this, id, params)
        .then(result => this.Model
          .delete(removeParams)
          .then(() => result)
        )
        .catch(error => errorHandler(error, id));
    }

    return find(this, params)
      .then(result => {
        let data = (Array.isArray(result) ? result : result.data);

        if (!data.length) {
          return result;
        }

        return this.Model.bulk({
          refresh: this.params.refresh || false,
          body: data.map(doc => ({
            delete: { _index: this.params.index, _type: this.params.type, _id: doc[this.id] }
          }))
        })
        .then(() => result);
      });
  }
}

export default function init (options) {
  debug('Initializing feathers-elasticsearch plugin');
  return new Service(options);
}

function find (service, params) {
  let { filters, query } = filter(params.query, service.paginate);
  let esQuery = parseQuery(query);
  let findParams = merge(
    true,
    {
      _source: filters.$select || true,
      body: {}
    },
    service.params
  );

  // The `refresh` param is not recognised for search in Es.
  delete findParams.refresh;

  if (esQuery) {
    findParams.body.query = esQuery;
  }

  if (undefined !== filters.$limit) {
    findParams.size = filters.$limit;
  }

  if (undefined !== filters.$skip) {
    findParams.from = filters.$skip;
  }

  if (undefined !== filters.$sort) {
    findParams.sort = Object.keys(filters.$sort)
      .map(key => key + ':' + (filters.$sort[key] > 0 ? 'asc' : 'desc'));
  }

  return service.Model.search(findParams)
    .then(result => mapFind(
      result,
      service.id,
      service.metaPrefix,
      filters,
      service.paginate.default !== undefined
    ));
}

function get (service, id, params) {
  let { filters } = filter(params.query, service.pagination);
  let getParams = merge(
    true,
    { _source: filters.$select || true },
    service.params,
    { id }
  );

  return service.Model.get(getParams)
    .then(result => mapGet(result, service.id, service.metaPrefix));
}

function errorHandler (error, id) {
  if (error.statusCode === 404) {
    throw new errors.NotFound(`No record found for id '${id}'`);
  }

  throw new errors.GeneralError('Ooops', error);
}
