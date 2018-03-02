/* eslint-disable no-unused-expressions */
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
      return app.service('mobiles')
        .remove('bobMobile', { query: { parent: 'bob' } })
        .then(result => {
          expect(result.number).to.equal('321');
        });
    });

    it('should remove items which have a parent', () => {
      return app.service('mobiles')
        .create([
          { number: 'removeme', no: 1, parent: 'bob' },
          { number: 'removeme', no: 2, parent: 'moody' }
        ])
        .then(() => app.service('mobiles')
          .remove(
            null,
            { query: { number: 'removeme', $sort: { no: 1 } } }
          )
        )
        .then(results => {
          expect(results.length).to.equal(2);
          expect(results[0].number).to.equal('removeme');
          expect(results[0]._meta._parent).to.equal('bob');
          expect(results[1].number).to.equal('removeme');
          expect(results[1]._meta._parent).to.equal('moody');
        });
    });
  });
}

module.exports = remove;
