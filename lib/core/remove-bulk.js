'use strict';

function removeBulk (service, params) {
  const { find } = service.core;

  return find(service, params)
    .then(results => {
      const found = Array.isArray(results) ? results : results.data;

      if (!found.length) {
        return found;
      }

      const bulkRemoveParams = Object.assign(
        {
          body: found.map(item => {
            const { _id, _parent: parent, _routing: routing } = item[service.meta];

            return { delete: { _id, routing: routing || parent } };
          })
        },
        service.esParams
      );

      return service.Model.bulk(bulkRemoveParams)
        .then(results => {
          const items = results.body ? results.body.items : (results.items || []);
          return items
            .map((item, index) => (item.delete && item.delete.status === 200) ? found[index] : false)
            .filter(item => !!item);
        });
    });
}

module.exports = removeBulk;
