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

  public async bulkUpdate(indexName: string, data: any[]): Promise<void> {
    const body = data.flatMap(doc => [
      { update: { _index: indexName, _id: doc._id } },
      {
        doc: { body: { isDeleted: true, deletedAt: new Date().toISOString() } }
      }
    ]);
    await this.client.bulk({ refresh: true, body });
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

  /**
   * Deletes documents from the specified index based on a query.
   * @param indexName - The name of the index to delete documents from.
   * @param query - The query object to filter the documents to be deleted.
   * @returns A Promise that resolves to void.
   * @throws Throws an error if the deletion fails.
   */
  public async deleteByQuery(indexName: string | string[], query: object): Promise<void> {
    try {
      await this.client.indices.refresh({ index: indexName });
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
   * Updates a document in the specified Elasticsearch index.
   * @param indexName - The name of the Elasticsearch index.
   * @param id - The ID of the document to update.
   * @param updatedDoc - The updated document object.
   * @returns A Promise that resolves with void when the update is complete.
   * @throws An error if the update fails.
   */
  public async updateDocument(indexName: string, id: string, updatedDoc: object): Promise<void> {
    try {
      await this.client.update({
        index: indexName,
        id,
        body: {
          doc: updatedDoc,
        }
      });
    } catch (err) {
      logger.error('updateDocument.error : ', { err });
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
    try {
      await this.client.updateByQuery({
        index: indexName,
        body: {
          query,
          script,
        }
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
      await this.client.indices.refresh({ index: indexName });
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
    const body = data.flatMap(doc => [
      { index: { _index: indexName, _id: doc._id } },
      { body: { ...doc.body } }
    ]);

    await this.client.bulk({ refresh: true, body });
  }
}
