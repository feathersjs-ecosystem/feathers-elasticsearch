const { expect } = require('chai');

function remove (app, serviceName) {
  describe('remove()', () => {
    it('should return empty array if no items have been removed (bulk)', () => {
      return app.service(serviceName)
        .remove(
          null,
          { query: { id: 'better-luck-next-time' } }
        )
        .then(results => {
          expect(results).to.be.an('array').and.be.empty;
        });
    });

    it('should remove an item with a specified parent', () => {
      return app.service('aka')
        .create({ name: 'Bobster', parent: 'bob', id: 'bobAka' })
        .then(() => {
          return app.service('aka').remove(
            'bobAka',
            { query: { parent: 'bob' } }
          );
        })
        .then(result => {
          expect(result.name).to.equal('Bobster');
        });
    });

    it('should remove items which have a parent', () => {
      return app.service('aka')
        .create([
          { name: 'removeme', no: 1, parent: 'bob' },
          { name: 'removeme', no: 2, parent: 'moody' }
        ])
        .then(() => app.service('aka')
          .remove(
            null,
            { query: { name: 'removeme', $sort: { no: 1 } } }
          )
        )
        .then(results => {
          expect(results.length).to.equal(2);
          expect(results[0].name).to.equal('removeme');
          expect(results[0]._meta._parent).to.equal('bob');
          expect(results[1].name).to.equal('removeme');
          expect(results[1]._meta._parent).to.equal('moody');
        });
    });
  });
}

module.exports = remove;
