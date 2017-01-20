# feathers-elasticsearch

[![Build Status](https://travis-ci.org/jciolek/feathers-elasticsearch.svg?branch=es-5.1-tests)](https://travis-ci.org/jciolek/feathers-elasticsearch)
[![Code Climate](https://codeclimate.com/github/jciolek/feathers-elasticsearch/badges/gpa.svg)](https://codeclimate.com/github/jciolek/feathers-elasticsearch)
[![Test Coverage](https://codeclimate.com/github/jciolek/feathers-elasticsearch/badges/coverage.svg)](https://codeclimate.com/github/jciolek/feathers-elasticsearch/coverage)
[![Dependency Status](https://david-dm.org/jciolek/feathers-elasticsearch/status.svg)](https://david-dm.org/jciolek/feathers-elasticsearch)
[![Download Status](https://img.shields.io/npm/dm/feathers-elasticsearch.svg?style=flat-square)](https://www.npmjs.com/package/feathers-elasticsearch)

> Elasticsearch adapter for FeathersJs

## Installation

```
npm install elasticsearch feathers-elasticsearch --save
```

## Documentation

Please refer to the [Feathers database adapter documentation](http://docs.feathersjs.com/databases/readme.html) for more details or directly at:

- [Extending](http://docs.feathersjs.com/databases/extending.html) - How to extend a database adapter
- [Pagination and Sorting](http://docs.feathersjs.com/databases/pagination.html) - How to use pagination and sorting for the database adapter
- [Querying](http://docs.feathersjs.com/databases/querying.html) - The common adapter querying mechanism

## Getting Started

The following example will create a `messages` endpoint and connect to a local `messages` type in the `test` index on the `elasticsearch` database.

```js
const elasticsearch = require('elasticsearch');
const feathers = require('feathers');
const service = require('feathers-elasticsearch');
const app = feathers();

app.use(`/messages}`, service({
  Model: new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '5.0'
  }),
  elasticsearch: {
    index: 'test',
    type: 'messages'
  }
}));

app.listen(3030);
```

## Options

The following options can be passed when creating a new Elasticsearch service:

- `Model` (**required**) - The Elasticsearch client instance.
- `elasticsearch` (**required**) - Configuration object for elasticsearch requests. The required properties are `index` and `type`. Apart from that you can specify anything that can be passed to all requests going to Elasticsearch. Another recognised property is [https://www.elastic.co/guide/en/elasticsearch/guide/2.x/near-real-time.html#refresh-api](`refresh`) which is set to `false` by default. Anything else use at your own risk.
- `id` (default: '_id') [optional] - The id property of your documents in this service.
- `meta` (default: '_meta') [optional] - The meta property of your documents in this service. The meta field is an object containing elasticsearch specific information, e.g. _score, _type, _index, and so forth.
- `paginate` [optional] - A pagination object containing a `default` and `max` page size (see the [Pagination chapter](http://docs.feathersjs.com/databases/pagination.html)).

## Complete Example

Here's an example of a Feathers server that uses `feathers-elasticsearch`. 

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const service = require('feathers-elasticsearch');
const elasticsearch = require('elasticsearch');

const messageService = service({
  Model: new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '5.0'
  }),
  paginate: {
    default: 10,
    max: 50
  },
  elasticsearch: {
    index: 'test',
    type: 'messages'
  }
});

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  // Initialize your feathers plugin
  .use('/messages', messageService)
  .use(errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

You can run this example by using `npm start` and going to [localhost:3030/messages](http://localhost:3030/messages).
You should see an empty array. That's because you don't have any messages yet but you now have full CRUD for your new message service!

## Supported Elasticsearch versions

feathers-elasticsearch is currently tested on Elasticsearch 2.4, 5.0 and 5.1. The lowest version supported is 2.4,
however that does not mean it wouldn't work fine on anything lower than 2.4.


## Quirks

### Updating and deleting by query

Elasticsearch is special in many ways. For example, the [https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update-by-query.html]("update by query") API is still considered experimental and so is the [https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html]("delete by query") API introduced in Elasticsearch 5.0.

Just to clarify - update in Elasticsearch is an equivalent to `patch` in feathers. I will use `patch` from now on, to set focus on the feathers side of the fence.

Considering the above, our implementation of path / remove by query uses combo of find and bulk patch / remove, which in turn means for you:

- Standard pagination is taken into account for patching / removing by query, so you have no guarantee that all existing documents matching your query will be patched / removed.
- The operation is a bit slower than it could potentially be, because of the two-step process involved.

Considering, however that elasticsearch is mainly used to dump data in it and search through it, I presume that should not be a great problem.

### Full-text search

In the first version of feathers-elasticsearch full texts search has not been implemented yet. It is coming soon. It is very important feature and it sits at the top of my TODO list.

### Performance considerations

None of the data mutating operations in Elasticsearch v2.4 (create, update, patch, remove) returns the full resulting document, therefore I had to resolve to using get as well in order to return complete data. This solution is of course adding a bit of an overhead, although it is also compliant with the standard behaviour expected of a feathers database adapter.

The conceptual solution for that is quite simple. This behaviour will be configurable through a `lean` switch allowing to get rid of those additional gets should they be not needed for your application. This feature will be added soon as well.


## License

Copyright (c) 2017

Licensed under the [MIT license](LICENSE).
