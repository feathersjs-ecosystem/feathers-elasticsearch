'use strict';

const errors = require('@feathersjs/errors');

function getType (value) {
  let type = (Array.isArray(value) && 'array') ||
    (value === null && 'null') ||
    typeof value;

  return (type === 'number' && isNaN(value) && 'NaN') || type;
}

function validateType (value, name, validators) {
  let type = getType(value);

  if (typeof validators === 'string') {
    validators = [validators];
  }

  if (validators.indexOf(type) === -1) {
    throw new errors.BadRequest(`${name} should be one of ${validators.join(', ')}`);
  }

  return type;
}

function removeProps (object, ...props) {
  let result = Object.assign({}, object);

  props.forEach(prop => delete result[prop]);

  return result;
}

module.exports = { getType, validateType, removeProps };
