'use strict';

function removeBulk (service, params) {
  const { find } = service.core;

  return find(service, params)
    .then(results => {
      let found = Array.isArray(results) ? results : results.data;
      let bulkRemoveParams;

      if (!found.length) {
        return found;
      }

      bulkRemoveParams = Object.assign(
        {
          body: found.map(item => {
            let { _id, _parent: parent, _routing: routing } = item[service.meta];

            return {
              delete: { _id, routing: routing || parent } };
          })
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
