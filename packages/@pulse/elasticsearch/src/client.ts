import { Client } from '@elastic/elasticsearch';
import { ConnectionOptions, ElasticSearchDocument, IElasticSearchClient } from '../types';

export class ElasticSearchClient implements IElasticSearchClient {
  private client: Client;
  private elasticNode = 'http://localhost:9200';

  constructor(options?: ConnectionOptions) {
    this.client = new Client({
      node: this.elasticNode,
      auth: {
        username: options?.username ? options.username : '',
        password: options?.password ? options.password : '',
      },
    });
  }

  public getClient(): Client {
    return this.client;
  }

  public async putDocument(index: string, document: ElasticSearchDocument): Promise<void> {
    const { id, ...body } = document;
    await this.client.index({
      index,
      id,
      body,
    });
  }

  public async search(indexName: string, searchKey: string, searchValue: string): Promise<any> {
    await this.client.indices.refresh({ index: indexName });
    const result = await this.client.search({
      index: indexName,
      query: {
        match: { [`body.${searchKey}`]: searchValue },
      },
    });
    return result;
  }
}
