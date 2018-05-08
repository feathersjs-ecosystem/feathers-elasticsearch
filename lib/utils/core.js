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

function getCompatVersion (
  allVersions,
  curVersion,
  defVersion = '2.4'
) {
  const curVersionNum = Number(curVersion);
  const prevVersionsNum = allVersions
    .map(version => Number(version))
    .filter(version => version <= curVersionNum);

  if (!prevVersionsNum.length) {
    return defVersion;
  }

  return Math.max(...prevVersionsNum).toFixed(1);
}

module.exports = {
  getType,
  validateType,
  removeProps,
  getCompatVersion
};
