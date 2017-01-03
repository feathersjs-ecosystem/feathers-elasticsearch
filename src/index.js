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
    return find(this, params);
  }

  // GET
  get (id, params) {
    return get(this, id, params)
      .catch(error => errorHandler(error, id));
  }

  // POST
  create (data, params) {
    let bulkCreateParams;

    // Check if we are adding a single items.
    if (!Array.isArray(data)) {
      let id = data[this.id];
      let hasId = undefined !== id;
      let createParams = merge(true, this.params, { body: data });
      // Elasticsearch `create` expects _id, whereas index does not.
      // Our `create` supports both forms.
      let method = hasId ? 'create' : 'index';

      if (hasId) {
        delete createParams.body[this.id];
        createParams._id = String(id);
      }

      return this.Model[method](createParams)
        .then(result => get(this, result._id, params))
        .catch(error => errorHandler(error, id));
    }

    bulkCreateParams = merge(true, this.params);
    // Elasticsearch bulk API takes two objects per index or create operation.
    // First is the action descriptor, the second is the argument.
    // https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
    bulkCreateParams.body = data.reduce((result, docArg) => {
      let doc = Object.assign(docArg);

      if (doc[this.id] !== undefined) {
        result.push({ create: { _id: doc[this.id] } });
        delete doc[this.id];
      } else {
        result.push({ index: {} });
      }

      result.push(doc);

      return result;
    }, []);

    return this.Model.bulk(bulkCreateParams)
      .then(result => mget(
        this,
        result.items.map(item => (item.index || item.create)._id),
        params
      ));
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

    // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
    // TODO: add `allowUpsert` option which will allow upserts and allieviate the need for the first get.
    return get(this, id, merge(true, params, { query: { $select: false } }))
      .then(result => this.Model.index(updateParams))
      .then(result => get(this, result._id, params))
      .catch(error => errorHandler(error, id));
  }

  // PATCH
  patch (id, data, params) {
    let { filters } = filter(params.query, this.paginate);

    if (id !== null) {
      let patchParams = merge(
        true,
        this.params,
        {
          id: String(id),
          body: {
            doc: trimMeta(data, this.metaPrefix)
          },
          _source: filters.$select
        }
      );
      // The `get` here is just to throw 404 if the document does not exist.
      // Elasticsearch does upsert, normally.
      return get(this, id, params)
        .then(() => this.Model.update(patchParams))
        .catch(error => errorHandler(error, id))
        .then(result => mapPatch(result, this.id, this.metaPrefix));
    }

    return find(this, merge.recursive(true, params, { paginate: false, query: { $select: false } }))
      .then(results => {
        let bulkUpdateParams = merge(true, this.params, { _source: filters.$select });

        if (!results.length) {
          return results;
        }

        bulkUpdateParams.body = results.reduce((result, doc) => {
          result.push({ update: { _id: doc[this.id] } });
          result.push({ doc: trimMeta(data, this.metaPrefix) });

          return result;
        }, []);

        return this.Model.bulk(bulkUpdateParams);
      })
      .then(results => results.items
          .filter(result => result.update.result === 'updated')
          .map(result => mapPatch(result.update, this.id, this.metaPrefix))
      );
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

    return find(this, merge(true, params, { paginate: false }))
      .then(result => {
        if (!result.length) {
          return result;
        }

        return this.Model.bulk(merge(
          true,
          {
            body: result.map(doc => ({
              delete: { _id: doc[this.id] }
            }))
          },
          this.params
        ))
        .then(() => result);
      });
  }
}

export default function init (options) {
  debug('Initializing feathers-elasticsearch plugin');
  return new Service(options);
}

function find (service, params) {
  let paginate = params.paginate !== undefined ? params.paginate : service.paginate;
  let { filters, query } = filter(params.query, paginate);
  let esQuery = parseQuery(query);
  let findParams = merge(
    true,
    {
      _source: filters.$select,
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
      !!(paginate && paginate.default)
    ));
}

function get (service, id, params) {
  let { filters } = filter(params.query, service.pagination);
  let getParams = merge(
    true,
    { _source: filters.$select },
    service.params,
    { id: String(id) }
  );

  return service.Model.get(getParams)
    .then(result => mapGet(result, service.id, service.metaPrefix));
}

function mget (service, ids, params) {
  let { filters } = filter(params.query, service.paginate);
  let mgetParams = merge(
    true,
    { _source: filters.$select },
    service.params
  );

  mgetParams.body = { ids };

  return service.Model.mget(mgetParams)
    .then(result =>
      result.docs.map(doc => mapGet(doc, service.id, service.metaPrefix))
    );
}

function errorHandler (error, id) {
  if (error.statusCode === 404) {
    throw new errors.NotFound(`No record found for id '${id}'`);
  }

  throw new errors.GeneralError('Ooops', error);
}
