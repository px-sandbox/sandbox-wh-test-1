import { Client, RequestParams } from '@elastic/elasticsearch';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ConnectionOptions, ElasticSearchDocument, IElasticSearchClient } from '../types';
import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';

export class ElasticSearchClientGh implements IElasticSearchClient {
  private client: Client;
  private static instance: ElasticSearchClientGh;
  private constructor(options: ConnectionOptions) {
    this.client = new Client({
      node: options.host,
      auth: {
        username: options.username,
        password: options.password,
      },
      requestTimeout: Config.REQUEST_TIMEOUT,
    });
  }

  public static getInstance(): ElasticSearchClientGh {
    if (!ElasticSearchClientGh.instance) {
      ElasticSearchClientGh.instance = new ElasticSearchClientGh({
        host: Config.OPENSEARCH_NODE,
        username: Config.OPENSEARCH_USERNAME ?? '',
        password: Config.OPENSEARCH_PASSWORD ?? '',
      });
    }
    return ElasticSearchClientGh.instance;
  }


  public async search(
    indexName: string,
    query: object
  ): Promise<RequestParams.Search<MultiSearchBody>> {
    try {
      const result = await this.client.search({
        index: indexName,
        body: query,
      });
      return result.body;
    } catch (err) {
      logger.error('searchWithEsb.error: ', { err });
      throw err;
    }
  }

  public async queryAggs<T>(indexName: string, query: object): Promise<T> {
    try {
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

  public async putDocument(index: string, document: ElasticSearchDocument): Promise<void> {
    const { id, ...body } = document;
    await this.client.index({
      index,
      id,
      body,
    });
  }

  /**
   * Deletes documents from the specified index based on a query.
   * @param indexName - The name of the index to delete documents from.
   * @param query - The query object to filter the documents to be deleted.
   * @returns A Promise that resolves to void.
   * @throws Throws an error if the deletion fails.
   */
  public async deleteByQuery(indexName: string | string[], query: object): Promise<void> {
    try {
      await this.client.deleteByQuery({
        index: indexName,
        body: { query },
      });
    } catch (err) {
      logger.error('deleteByQuery.error : ', { err });
      throw err;
    }
  }

  /**
   * Updates documents in the specified index based on a query and a script.
   * @param indexName - The name of the index.
   * @param query - The query object specifying the documents to update.
   * @param script - The script object containing the update logic.
   * @throws {Error} If an error occurs while updating the documents.
   */
  public async updateByQuery(indexName: string, query: object, script: object): Promise<void> {
    logger.info(`updateByQuery.updateData for index : ${indexName}`);
    try {
      await this.client.updateByQuery({
        index: indexName,
        body: {
          ...query,
          script,
        },
      });
    } catch (err) {
      logger.error('updateByQuery.error : ', { err });
      throw err;
    }
  }
  /**
   * paginate a document from the specified Elasticsearch index.
   */
  public async paginateSearch(
    indexName: string,
    query: object
  ): Promise<RequestParams.Search<MultiSearchBody>> {
    try {
      const { body } = await this.client.search({
        index: indexName,
        body: query,
      });
      return body;
    } catch (err) {
      logger.error('searchWithEsb.error: ', { err });
      throw err;
    }
  }

  public async bulkInsert(indexName: string, data: any[]): Promise<void> {
    try {
      const body = data.flatMap((doc) => [
        { index: { _index: indexName, _id: doc._id } },
        { body: { ...doc.body } },
      ]);

      await this.client.bulk({ refresh: true, body });
    } catch (err) {
      logger.error('bulkInsert.error: ', { err });
    }
  }

  public async bulkUpdate(indexName: string, data: any[]): Promise<void> {
    try {
      const body = data.flatMap((doc) => [
        { update: { _index: indexName, _id: doc._id } },
        {
          doc: { body: { isDeleted: true, deletedAt: new Date().toISOString() } },
        },
      ]);

      await this.client.bulk({ refresh: true, body });
    } catch (err) {
      logger.error('bulkUpdate.error: ', { err });
    }
  }

  public async isIndexExists(
    indexName: string
  ): Promise<TransportRequestPromise<ApiResponse<boolean, unknown>>> {
    try {
      return this.client.indices.exists({ index: indexName });
    } catch (err) {
      logger.error(`isIndexExists.error: , ${ err }`);
      throw err;
    }
  }

  public async updateIndex(
    indexName: string,
    body: object
  ): Promise<TransportRequestPromise<ApiResponse<unknown, unknown>>> {
    try {
      return this.client.indices.putSettings({ index: indexName, body });
    } catch (err) {
      logger.error(`updateIndex.error: , ${ err }`);
      throw err;
    }
  }

  public async createIndex(
    indexName: string,
    body: object
  ): Promise<TransportRequestPromise<ApiResponse<unknown, unknown>>> {
    try {
      return this.client.indices.create({ index: indexName, body });
    } catch (err) {
      logger.error(`createIndex.error: , ${ err }`);
      throw err;
    }
  }
}
