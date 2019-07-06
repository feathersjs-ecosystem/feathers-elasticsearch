import { default as service } from 'feathers-elasticsearch';
import * as elasticsearch from 'elasticsearch';

const messageService = service({
  Model: new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '6.0'
  }),
  paginate: {
    default: 10,
    max: 50
  },
  elasticsearch: {
    index: 'test',
    type: 'messages'
  },
  esVersion: '6.0'
});
