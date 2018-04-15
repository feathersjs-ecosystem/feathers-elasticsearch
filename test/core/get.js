/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

function get (app, serviceName) {
  describe('get()', () => {
    it('should get an item with specified parent', () => {
      return app.service('mobiles')
        .get('douglasMobile', { query: { parent: 'douglas' } })
        .then(result => {
          expect(result.number).to.equal('991');
        });
    });
  });
}

module.exports = get;
