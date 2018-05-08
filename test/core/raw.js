const { expect } = require('chai');

function raw (app, serviceName) {
  describe('raw()', () => {
    it('should search documents in index with syntax term', () => {
      return app.service(serviceName)
        .raw('search', {
          size: 50,
          body: {
            query: {
              term: {
                name: 'Bob'
              }
            }
          }
        }).then(results => {
          expect(results.hits.hits.length).to.equal(1);
        });
    });

    it('should search documents in index with syntax match', () => {
      return app.service(serviceName)
        .raw('search', {
          size: 50,
          body: {
            query: {
              match: {
                bio: 'javascript'
              }
            }
          }
        }).then(results => {
          expect(results.hits.hits.length).to.equal(1);
        });
    });

    it('should show the mapping of index test', () => {
      return app.service('aka')
        .raw('indices.getMapping', {})
        .then(results => {
          expect(results.test.mappings.aka._parent.type).to.equal('people');
        });
    });

    it('should return a promise when the passed in method is not defined', () => {
      app
        .service(serviceName)
        .raw(undefined, {})
        .catch(err => {
          expect(err.message === 'params.method must be defined.');
        });
    });

    it('should return a promise when service.method is not a function', () => {
      app
        .service(serviceName)
        .raw('notafunction', {})
        .catch(err => {
          expect(err.message === 'There is no query method notafunction.');
        });
    });

    it('should return a promise when service.method.extention is not a function', () => {
      app
        .service(serviceName)
        .raw('indices.notafunction', {})
        .catch(err => {
          expect(err.message === 'There is no query method indices.notafunction.');
        });
    });
  });
}

module.exports = raw;
