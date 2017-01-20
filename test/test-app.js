import elasticsearch from 'elasticsearch';
import feathers from 'feathers';
import rest from 'feathers-rest';
import socketio from 'feathers-socketio';
import bodyParser from 'body-parser';
import service from '../lib';

// Connect to the db, create and register a Feathers service.
const db = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.0'
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
