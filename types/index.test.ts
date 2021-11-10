import { default as service } from 'feathers-elasticsearch';
import * as elasticsearch from '@elastic/elasticsearch';

const messageService = service({
  Model: new elasticsearch.Client({
    node: 'http://localhost:9200'
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
