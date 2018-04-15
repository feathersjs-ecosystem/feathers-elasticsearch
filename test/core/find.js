const { expect } = require('chai');

function find (app, serviceName) {
  describe('find()', () => {
    it('should return empty array if no results found', () => {
      return app.service(serviceName)
        .find({ query: { id: 'better-luck-next-time' } })
        .then(results => {
          expect(results).to.be.an('array').and.be.empty;
        });
    });

    it('should return empty paginated results if no results found', () => {
      return app.service(serviceName)
        .find({
          query: { id: 'better-luck-next-time' },
          paginate: { default: 10 }
        })
        .then(results => {
          expect(results.total).to.equal(0);
          expect(results.data).to.be.an('array').and.be.empty;
        });
    });

    it('should filter results by array parameter', () => {
      return app.service(serviceName)
        .find({
          query: { tags: ['legend', 'javascript'] }
        })
        .then(results => {
          expect(results.length).to.equal(1);
          expect(results[0].name).to.equal('Douglas');
        });
    });

    describe('special filters', () => {
      it('can $prefix', () => {
        return app.service(serviceName)
          .find({
            query: { name: { $prefix: 'B' } }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Bob');
          });
      });

      it('can $all', () => {
        return app.service(serviceName)
          .find({
            query: { $all: true }
          })
          .then(results => {
            expect(results.length).to.equal(3);
          });
      });

      it('can $match', () => {
        return app.service(serviceName)
          .find({
            query: { bio: { $match: 'I like JavaScript' } }
          })
          .then(results => {
            expect(results.length).to.equal(2);
          });
      });

      it('can $phrase', () => {
        return app.service(serviceName)
          .find({
            query: { bio: { $phrase: 'I like JavaScript' } }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Bob');
          });
      });

      it('can $phrase_prefix', () => {
        return app.service(serviceName)
          .find({
            query: { bio: { $phrase_prefix: 'I like JavaS' } }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Bob');
          });
      });

      it('can $or correctly with other filters', () => {
        return app.service(serviceName)
          .find({
            query: {
              $or: [
                { name: 'Moody' },
                { name: 'Douglas' }
              ],
              bio: { $match: 'JavaScript legend' }
            }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Douglas');
          });
      });

      it('can $and', () => {
        return app.service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $and: [
                { tags: 'javascript' },
                { tags: 'programmer' }
              ]
            }
          })
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].name).to.equal('Bob');
            expect(results[1].name).to.equal('Douglas');
          });
      });

      it('can $sqs (simple_query_string)', () => {
        return app.service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $sqs: {
                $fields: [
                  'bio',
                  'name^5'
                ],
                $query: '+like -javascript',
                $operator: 'and'
              }
            }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Moody');
          });
      });

      it('can $sqs (simple_query_string) with other filters', () => {
        return app.service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $and: [
                { tags: 'javascript' }
              ],
              $sqs: {
                $fields: [
                  'bio'
                ],
                $query: '-legend'
              }
            }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Bob');
          });
      });

      it('can $child', () => {
        return app.service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $child: {
                $type: 'mobiles',
                number: '991'
              }
            }
          })
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].name).to.equal('Douglas');
            expect(results[1].name).to.equal('Moody');
          });
      });

      it('can $parent', () => {
        return app.service('mobiles')
          .find({
            query: {
              $sort: { number: 1 },
              $parent: {
                $type: 'people',
                name: 'Douglas'
              }
            }
          })
          .then(results => {
            expect(results.length).to.equal(2);
            expect(results[0].number).to.equal('991');
            expect(results[1].number).to.equal('992');
          });
      });

      it('can $nested', () => {
        return app.service(serviceName)
          .find({
            query: {
              $nested: {
                $path: 'addresses',
                'addresses.street': '1 The Road'
              }
            }
          })
          .then(results => {
            expect(results.length).to.equal(1);
            expect(results[0].name).to.equal('Bob');
          });
      });
    });
  });
}

module.exports = find;
