const { expect } = require('chai');
const errors = require('@feathersjs/errors');

const {
  getType,
  validateType,
  removeProps
} = require('../../lib/utils/core');

module.exports = function utilsCoreTests () {
  describe('getType', () => {
    it('should recognize number', () => {
      expect(getType(1)).to.equal('number');
    });

    it('should recognize string', () => {
      expect(getType('1')).to.equal('string');
    });

    it('should recognize boolean', () => {
      expect(getType(true)).to.equal('boolean');
      expect(getType(false)).to.equal('boolean');
    });

    it('should recognize undefined', () => {
      expect(getType(undefined)).to.equal('undefined');
    });

    it('should recognize null', () => {
      expect(getType(null)).to.equal('null');
    });

    it('should recognize NaN', () => {
      expect(getType(NaN)).to.equal('NaN');
    });

    it('should recognize object', () => {
      expect(getType({})).to.equal('object');
    });

    it('should recognize array', () => {
      expect(getType([])).to.equal('array');
    });
  });

  describe('validateType', () => {
    it('should accept one validator as a string', () => {
      expect(validateType(1, 'val', 'number')).to.be.ok;
    });

    it('should accept multiple validators as an array', () => {
      expect(validateType(1, 'val', ['number', 'object'])).to.be.ok;
    });

    it('should return the type', () => {
      expect(validateType(1, 'val', 'number')).to.equal('number');
      expect(validateType('abc', 'val', ['number', 'array', 'string'])).to.equal('string');
      expect(validateType(true, 'val', ['number', 'array', 'boolean'])).to.equal('boolean');
      expect(validateType(false, 'val', ['number', 'array', 'boolean'])).to.equal('boolean');
      expect(validateType(null, 'val', ['number', 'object', 'null'])).to.equal('null');
      expect(validateType(undefined, 'val', ['number', 'object', 'undefined'])).to.equal('undefined');
      expect(validateType(NaN, 'val', ['number', 'object', 'NaN'])).to.equal('NaN');
      expect(validateType([], 'val', ['number', 'array', 'undefined'])).to.equal('array');
      expect(validateType({}, 'val', ['number', 'object', 'undefined'])).to.equal('object');
    });

    it('should throw if none of the validators match', () => {
      expect(() => validateType(1, 'val', 'null')).to.throw(errors.BadRequest);
      expect(() => validateType(1, 'val', ['null', 'object', 'array'])).to.throw(errors.BadRequest);
      expect(() => validateType('abc', 'val', ['number', 'object', 'undefined'])).to.throw(errors.BadRequest);
      expect(() => validateType(true, 'val', ['number', 'object', 'array'])).to.throw(errors.BadRequest);
      expect(() => validateType(null, 'val', ['number', 'object', 'string'])).to.throw(errors.BadRequest);
      expect(() => validateType([], 'val', ['number', 'object', 'null'])).to.throw(errors.BadRequest);
    });
  });

  describe('removeProps', () => {
    let object;

    beforeEach(() => {
      object = {
        _id: 12,
        _meta: {
          _index: 'test'
        },
        age: 13
      };
    });

    it('should remove all properties from given list', () => {
      expect(removeProps(object, '_id', '_meta')).to
        .deep.equal({ age: 13 });
    });

    it('should not change the original object', () => {
      let objectSnapshot = JSON.stringify(object);

      removeProps(object);
      expect(JSON.stringify(object)).to
        .equal(objectSnapshot);
    });

    it('should work if some properties are not defined on the object', () => {
      expect(removeProps(object, '_meta', 'not_there')).to
        .deep.equal({ _id: 12, age: 13 });
    });

    it('should work if there are no props to remove', () => {
      expect(removeProps(object)).to
        .deep.equal(object);
    });
  });
};
