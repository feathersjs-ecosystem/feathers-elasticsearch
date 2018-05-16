'use strict';

const createCore = require('./core');

function getCreateParams (service, docDescriptor) {
  let { id, parent, routing, join, doc } = docDescriptor;

  if (join) {
    doc = Object.assign(
      {
        [service.join]: {
          name: join,
          parent
        }
      },
      doc
    );
  }

  return Object.assign(
    { id, routing, body: doc },
    service.esParams
  );
}

function create (...args) {
  return createCore(...args, { getCreateParams });
}

module.exports = create;
