'use strict';

const { mapBulk, removeProps } = require('../utils');
const getBulk = require('./get-bulk');

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

      return getBulk(service, docs, params)
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

module.exports = createBulk;
