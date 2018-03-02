/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

function get (app, serviceName) {
  describe('get()', () => {
    it('should get an item with specified parent', () => {
      return app.service('mobiles')
        .get('bobMobile', { query: { parent: 'bob' } })
        .then(result => {
          expect(result.number).to.equal('0123');
        });
    });
  });
}

module.exports = get;
