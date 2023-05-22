import { Client } from '@elastic/elasticsearch';
import { ConnectionOptions, ElasticSearchDocument, IElasticSearchClient } from '../types';

export class ElasticSearchClient implements IElasticSearchClient {
  private client: Client;

  constructor(options: ConnectionOptions) {
    this.client = new Client({
      node: options.host,
      auth: { username: options.username, password: options.password },
    });
  }

  public getClient(): Client {
    return this.client;
  }

  public async saveOrUpdate(index: string, document: ElasticSearchDocument): Promise<void> {
    const { id, ...body } = document;
    await this.client.index({
      index,
      id,
      body,
    });
  }
}
