'use strict';

const find = require('./find');

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

module.exports = removeBulk;
