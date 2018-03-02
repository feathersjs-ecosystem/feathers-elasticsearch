/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

function update (app, serviceName) {
  describe('update()', () => {
    it('should update an item with specified parent', () => {
      return app.service('mobiles')
        .update(
          'bobMobile',
          { number: '123' },
          { query: { parent: 'bob' } }
        )
        .then(result => {
          expect(result.number).to.equal('123');
        });
    });
  });
}

module.exports = update;
