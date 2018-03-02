'use strict';

const find = require('./find');
const get = require('./get');
const getBulk = require('./get-bulk');
const create = require('./create');
const createBulk = require('./create-bulk');
const patch = require('./patch');
const patchBulk = require('./patch-bulk');
const remove = require('./remove');
const removeBulk = require('./remove-bulk');
const update = require('./update');
const raw = require('./raw');

module.exports = {
  find,
  get,
  getBulk,
  create,
  createBulk,
  patch,
  patchBulk,
  remove,
  removeBulk,
  update,
  raw
};
