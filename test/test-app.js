/* eslint-disable no-unused-expressions */
const elasticsearch = require('elasticsearch');
const feathers = require('feathers');
const rest = require('feathers-rest');
const socketio = require('feathers-socketio');
const bodyParser = require('body-parser');
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
let app = feathers()
  // Enable REST services
  .configure(rest())
  // Enable Socket.io services
  .configure(socketio())
  // Turn on JSON parser for REST services
  .use(bodyParser.json())
  // Turn on URL-encoded parser for REST services
  .use(bodyParser.urlencoded({ extended: true }))
  .use('/todos', todoService);

// Start the server.
const port = 3030;

module.exports = app.listen(port);
