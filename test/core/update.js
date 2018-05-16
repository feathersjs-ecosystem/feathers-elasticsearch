const { expect } = require('chai');

function update (app, serviceName) {
  describe('update()', () => {
    it('should update an item with specified parent', () => {
      return app.service('aka')
        .create({ name: 'Bobster', parent: 'bob', id: 'bobAka', aka: 'alias' })
        .then(() => {
          return app.service('aka').update(
            'bobAka',
            { name: 'Boberson' },
            { query: { parent: 'bob' } }
          );
        })
        .then(result => {
          expect(result.name).to.equal('Boberson');

          return app.service('aka').remove(
            'bobAka',
            { query: { parent: 'bob' } }
          );
        });
    });
  });
}

module.exports = update;
