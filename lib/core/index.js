'use strict';

const { getCompatVersion } = require('../utils/core');

function getCore (esVersion) {
  return {
    find: require('./find'),
    get: require('./get'),
    getBulk: require('./get-bulk'),
    create: require(
      `./create/${getCompatVersion(['2.4', '6.0'], esVersion)}`
    ),
    createBulk: require(
      `./create-bulk/${getCompatVersion(['2.4', '6.0'], esVersion)}`
    ),
    patch: require('./patch'),
    patchBulk: require('./patch-bulk'),
    remove: require('./remove'),
    removeBulk: require('./remove-bulk'),
    update: require(
      `./update/${getCompatVersion(['2.4', '6.0'], esVersion)}`
    ),
    raw: require('./raw')
  };
}

module.exports = getCore;
