import { Client, RequestParams } from '@elastic/elasticsearch';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { logger } from 'core';
import { ConnectionOptions, ElasticSearchDocument, IElasticSearchClient } from '../types';

export class ElasticSearchClient implements IElasticSearchClient {
  private client: Client;
  constructor(options: ConnectionOptions) {
    this.client = new Client({
      node: options.host,
      auth: {
        username: options.username,
        password: options.password,
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

  public async search(
    indexName: string,
    searchKey: string,
    searchValue: string
  ): Promise<RequestParams.Search<MultiSearchBody>> {
    await this.client.indices.refresh({ index: indexName });
    const result = await this.client.search({
      index: indexName,
      body: {
        query: {
          match: { [`body.${searchKey}`]: searchValue },
        },
      },
    });

    return result.body;
  }

  public async searchWithEsb(
    indexName: string,
    query: object
  ): Promise<RequestParams.Search<MultiSearchBody>> {
    try {
      await this.client.indices.refresh({ index: indexName });
      const result = await this.client.search({
        index: indexName,
        body: {
          query,
        },
      });
      return result.body;
    } catch (err) {
      logger.error('searchWithEsb.error: ', { err });
      throw err;
    }
  }

  public async queryAggs<T>(indexName: string, query: object): Promise<T> {
    try {
      await this.client.indices.refresh({ index: indexName });
      const { body } = await this.client.search({
        index: indexName,
        body: query,
      });
      return body.aggregations;
    } catch (err) {
      logger.error('queryAggs.error : ', { err });
      throw err;
    }
  }
}
