/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const errors = require('@feathersjs/errors');

function create (app, serviceName) {
  describe('create()', () => {
    it('should support creating single element with provided id', () => {
      return app.service(serviceName)
        .create({ name: 'Bob', id: 'BobId' })
        .then(result => {
          expect(result.name).to.equal('Bob');
          expect(result.id).to.equal('BobId');

          return app.service(serviceName).get('BobId');
        })
        .then(result => {
          expect(result.name).to.equal('Bob');

          return app.service(serviceName).remove('BobId');
        });
    });

    it('should throw Conflict when trying to create an element with existing id', () => {
      return app.service(serviceName)
        .create({ name: 'Bob', id: 'BobId' })
        .then(() => app.service(serviceName).create({ name: 'Bob', id: 'BobId' }))
        .then(() => { throw new Error('Should never get here'); })
        .catch(error => {
          expect(error instanceof errors.Conflict).to.be.true;

          return app.service(serviceName).remove('BobId');
        });
    });

    it('should support creating multiple elements with provided ids', () => {
      return app.service(serviceName)
        .create([
          { name: 'Cal', id: 'CalId' },
          { name: 'Max', id: 'MaxId' }
        ])
        .then(results => {
          expect(results[0].name).to.equal('Cal');
          expect(results[1].name).to.equal('Max');

          return app.service(serviceName).find({
            query: {
              id: { $in: ['CalId', 'MaxId'] }
            }
          });
        })
        .then(results => {
          expect(results[0].name).to.equal('Cal');
          expect(results[1].name).to.equal('Max');

          return app.service(serviceName).remove(
            null,
            { query: { id: { $in: ['CalId', 'MaxId'] } } }
          );
        });
    });

    it('should return created items in the same order as requested ones along with the errors', () => {
      return app.service(serviceName)
        .create([
          { name: 'Catnis', id: 'CatnisId' },
          { name: 'Catnis', id: 'CatnisId' },
          { name: 'Mark', id: 'MarkId' }
        ])
        .then(results => {
          expect(results[0].name).to.equal('Catnis');
          expect(results[1]._meta.status).to.equal(409);
          expect(results[2].name).to.equal('Mark');

          return app.service(serviceName).remove(
            null,
            { query: { id: { $in: ['CatnisId', 'MarkId'] } } }
          );
        });
    });

    it('should create single item with provided parent', () => {
      return app.service('mobiles')
        .create({ number: '0123456789', parent: 'bob' })
        .then(result => {
          expect(result.number).to.equal('0123456789');
          expect(result._meta._parent).to.equal('bob');

          return app.service('mobiles').remove(
            result.id,
            { query: { parent: 'bob' } }
          );
        });
    });

    it('should create multiple items with provided parents', () => {
      return app.service('mobiles')
        .create([
          { number: '0123', parent: 'bob', id: 'bobMobile' },
          { number: '1234', parent: 'moody' }
        ])
        .then(results => {
          const [ bobMobile, moodyMobile ] = results;

          expect(results.length).to.equal(2);
          expect(bobMobile.number).to.equal('0123');
          expect(bobMobile._meta._parent).to.equal('bob');
          expect(moodyMobile.number).to.equal('1234');
          expect(moodyMobile._meta._parent).to.equal('moody');

          return app.service('mobiles').remove(
            null,
            { query: { id: { $in: [ bobMobile.id, moodyMobile.id ] } } }
          );
        });
    });
  });
}

module.exports = create;
