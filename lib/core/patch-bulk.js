'use strict';

const { mapBulk, removeProps } = require('../utils');
const find = require('./find');
const getBulk = require('./get-bulk');

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

          return getBulk(service, docs, params)
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

module.exports = patchBulk;
