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

  props.forEach(prop =>
    prop !== undefined && delete result[prop]
  );

  return result;
}

function getDocDescriptor (service, data, ...supplementaryData) {
  let mergedData = supplementaryData
    .reduce((acc, dataObject) => Object.assign(acc, dataObject), { ...data });

  let id = mergedData[service.id] !== undefined
    ? String(mergedData[service.id])
    : undefined;
  let parent = mergedData[service.parent]
    ? String(mergedData[service.parent])
    : undefined;
  let routing = mergedData[service.routing]
    ? String(mergedData[service.routing])
    : parent;
  let join = service.join && mergedData[service.join];
  let doc = removeProps(
    data,
    service.meta,
    service.id,
    service.parent,
    service.routing,
    service.join
  );

  return { id, parent, routing, join, doc };
}

function getCompatVersion (
  allVersions,
  curVersion,
  defVersion = '5.0'
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

function getCompatProp (versionMap, curVersion) {
  return versionMap[getCompatVersion(Object.keys(versionMap), curVersion)];
}

function getQueryLength (service, query) {
  return Object.keys(
    removeProps(query, service.routing, service.parent)
  ).length;
}

module.exports = {
  getType,
  validateType,
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp,
  getQueryLength
};
