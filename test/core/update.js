/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

function update (app, serviceName) {
  describe('update()', () => {
    it('should update an item with specified parent', () => {
      return app.service('mobiles')
        .create({ number: '0123456789', parent: 'bob', id: 'bobMobile' })
        .then(() => {
          return app.service('mobiles').update(
            'bobMobile',
            { number: '123' },
            { query: { parent: 'bob' } }
          );
        })
        .then(result => {
          expect(result.number).to.equal('123');

          return app.service('mobiles').remove(
            'bobMobile',
            { query: { parent: 'bob' } }
          );
        });
    });
  });
}

module.exports = update;
