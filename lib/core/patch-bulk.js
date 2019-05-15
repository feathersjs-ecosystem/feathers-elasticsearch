'use strict';

const { mapBulk, removeProps, getDocDescriptor } = require('../utils');

function patchBulk(service, data, params) {
  const { find, getBulk } = service.core;

  const bodyReducer = mapped => (result, item) => {
    let { _id, _parent: parent, _routing: routing } = item[service.meta] || item;
    let { doc } = getDocDescriptor(service, mapped ? item : data);

    result.push({ update: { _id, routing: routing || parent } });
    result.push({ doc, doc_as_upsert: true });

    return result;
  };

  const buildBody = mapped => docs => {
    return docs.reduce(bodyReducer(mapped), []);
  };

  const buildUpdateParams = (docs, mapped = false) => Object.assign(
    {
      _source: false,
      body: buildBody(mapped)(docs),
    },
    service.esParams,
  );

  const buildMappedUpdateParams = docs => buildUpdateParams(docs, true);

  const bulkUpdate = (bulkUpdateParams) => {
    return service.Model.bulk(bulkUpdateParams)
      .then(result => {
        let patched = mapBulk(result.items, service.id, service.meta, service.join);
        let docs = patched
          .map((item, index) => Object.assign(
            { [service.routing]: bulkUpdateParams.body[index * 2].update.routing },
            item,
          ))
          .filter(item => item[service.meta].status === 200)
          .map(item => ({
            _id: item[service.meta]._id,
            routing: item[service.routing],
          }));

        if (!docs.length) {
          return patched;
        }

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
  };

  if (Array.isArray(data)) { //doing a direct patch using the docs sent in data
    const bulkUpdateParams = buildMappedUpdateParams(data);
    return bulkUpdate(bulkUpdateParams);
  } else {
    // Poor man's semi-deep object extension. We only want to override params.query.$select here.
    let findParams = Object.assign(
      removeProps(params, 'query'),
      {
        query: Object.assign(
          {},
          params.query,
          { $select: false },
        ),
      },
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

        bulkUpdateParams = buildUpdateParams(found);
        return bulkUpdate(bulkUpdateParams);
      });
  }
}

module.exports = patchBulk;
