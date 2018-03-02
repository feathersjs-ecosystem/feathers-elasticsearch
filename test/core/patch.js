/* eslint-disable no-unused-expressions */
const { expect } = require('chai');

function patch (app, serviceName) {
  describe('patch()', () => {
    it('should return empty array if no items have been found (bulk)', () => {
      return app.service(serviceName)
        .patch(
          null,
          { name: 'John' },
          { query: { id: 'better-luck-next-time' } }
        )
        .then(results => {
          expect(results).to.be.an('array').and.be.empty;
        });
    });

    it('should patch an item with a specified parent', () => {
      return app.service('mobiles')
        .patch(
          'bobMobile',
          { number: '321' },
          { query: { parent: 'bob' } }
        )
        .then(result => {
          expect(result.number).to.equal('321');
        });
    });

    it('should patch items which have parents (bulk)', () => {
      return app.service('mobiles')
        .create([
          { number: 'patchme', parent: 'bob' },
          { number: 'patchme', parent: 'moody' }
        ])
        .then(() => app.service('mobiles')
          .patch(
            null,
            { number: 'patched' },
            { query: { number: 'patchme' } }
          )
        )
        .then(results => {
          expect(results.length).to.equal(2);
          expect(results[0].number).to.equal('patched');
          expect(results[1].number).to.equal('patched');
        });
    });
  });
}

module.exports = patch;
