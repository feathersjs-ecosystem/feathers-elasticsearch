/* eslint-disable no-unused-expressions */
const elasticsearch = require('elasticsearch');
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const rest = require('@feathersjs/express/rest');
const socketio = require('@feathersjs/socketio');
const service = require('../lib');

const apiVersion = !process.env.ES_VERSION || process.env.ES_VERSION.split('.')[0] !== '5'
  ? '2.4'
  : '5.0';
// Connect to the db, create and register a Feathers service.
const db = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion
});

const todoService = service({
  Model: db,
  paginate: {
    default: 2,
    max: 4
  },
  elasticsearch: {
    index: 'test',
    type: 'todos',
    refresh: true
  }
});

// Create a feathers instance.
let app = express(// Enable REST services
feathers())
  .configure(rest())
  // Enable Socket.io services
  .configure(socketio())
  // Turn on JSON parser for REST services
  .use(express.json())
  // Turn on URL-encoded parser for REST services
  .use(express.urlencoded({ extended: true }))
  .use('/todos', todoService);

// Start the server.
const port = 3030;

module.exports = app.listen(port);
