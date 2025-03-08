import { Params, Paginated, Id, NullableId, Query, Hook } from '@feathersjs/feathers';
import { AdapterServiceOptions, AdapterParams, AdapterQuery } from '@feathersjs/adapter-commons'
import { Client } from '@elastic/elasticsearch'
export { estypes } from '@elastic/elasticsearch'

export interface ElasticAdapterServiceOptions extends AdapterServiceOptions {
  Model: Client;
  index?: string;
  elasticsearch?: any;
  parent?: string;
  routing?: string;
  join?: string;
  meta?: string;
}
