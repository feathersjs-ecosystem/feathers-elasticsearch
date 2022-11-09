import { ElasticAdapter } from "./adapter.js";

export * from "./error-handler.js";
export * from "./adapter.js";

export class ElasticService extends ElasticAdapter {
  async find(params) {
    return this._find(params);
  }

  async get(id, params) {
    return this._get(id, params);
  }

  async create(data, params) {
    return this._create(data, params);
  }

  async update(id, data, params) {
    return this._update(id, data, params);
  }

  async patch(id, data, params) {
    return this._patch(id, data, params);
  }

  async remove(id, params) {
    return this._remove(id, params);
  }
}
