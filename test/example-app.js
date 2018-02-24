/* eslint-disable no-unused-expressions */
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const rest = require('@feathersjs/express/rest');
const socketio = require('@feathersjs/socketio');
const service = require('../lib');
const db = require('./test-db');

// Connect to the db, create and register a Feathers service.
const todoService = service({
  Model: db.getClient(),
  paginate: {
    default: 2,
    max: 4
  },
  elasticsearch: db.getServiceConfig('todos')
});

// Create a feathers instance.
let app = express(feathers())
  .configure(rest())
  // Enable Socket.io services
  .configure(socketio())
  // Turn on JSON parser for REST services
  .use(express.json())
  // Turn on URL-encoded parser for REST services
  .use(express.urlencoded({ extended: true }))
  .use('/todos', todoService);

module.exports = app;
