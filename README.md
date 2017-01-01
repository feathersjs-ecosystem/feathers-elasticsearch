# feathers-elasticsearch

[![Build Status](https://travis-ci.org/jciolek/feathers-elasticsearch.png?branch=master)](https://travis-ci.org/jciolek/feathers-elasticsearch)
[![Code Climate](https://codeclimate.com/github/jciolek/feathers-elasticsearch/badges/gpa.svg)](https://codeclimate.com/github/jciolek/feathers-elasticsearch)
[![Test Coverage](https://codeclimate.com/github/jciolek/feathers-elasticsearch/badges/coverage.svg)](https://codeclimate.com/github/jciolek/feathers-elasticsearch/coverage)
[![Dependency Status](https://img.shields.io/david/jciolek/feathers-elasticsearch.svg?style=flat-square)](https://david-dm.org/jciolek/feathers-elasticsearch)
[![Download Status](https://img.shields.io/npm/dm/feathers-elasticsearch.svg?style=flat-square)](https://www.npmjs.com/package/feathers-elasticsearch)

> Elasticsearch adapter for FeathersJs

## Warning
This is very much work in progress. Master branch will become available when all the tests are passing.

## Installation

```
npm install feathers-elasticsearch --save
```

## Documentation

Please refer to the [feathers-elasticsearch documentation](http://docs.feathersjs.com/) for more details.

## Complete Example

Here's an example of a Feathers server that uses `feathers-elasticsearch`. 

```js
const feathers = require('feathers');
const rest = require('feathers-rest');
const hooks = require('feathers-hooks');
const bodyParser = require('body-parser');
const errorHandler = require('feathers-errors/handler');
const plugin = require('feathers-elasticsearch');

// Initialize the application
const app = feathers()
  .configure(rest())
  .configure(hooks())
  // Needed for parsing bodies (login)
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  // Initialize your feathers plugin
  .use('/plugin', plugin())
  .use(errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

## License

Copyright (c) 2017

Licensed under the [MIT license](LICENSE).
