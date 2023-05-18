import { Github } from 'abstraction';
import client from './client';

export class ElasticClient {
  public static async saveOrUpdateDocument(
    indexName: Github.Enums.IndexName,
    document: any
  ): Promise<void> {
    try {
      // CALL FOR CREATE INDICES
      // Use a forEach loop to iterate over the documents array
      // document.forEach(async (doc: any) => {
      const { id, ...body } = document;
      await client.index({
        index: indexName,
        id,
        body,
      });
      // });
    } catch (error) {
      console.error(error);
    }
  }
  public static async partialUpdateDocument(
    indexName: Github.Enums.IndexName,
    document: any
  ): Promise<void> {
    try {
      const { id, ...body } = document;
      await client.update({
        index: indexName,
        id,
        doc: body,
      });
    } catch (error) {
      console.error(error);
    }
  }
  public static async search(
    indexName: Github.Enums.IndexName,
    searchKey: string,
    searchValue: string
  ): Promise<any> {
    await client.indices.refresh({ index: indexName });

    const result = await client.search({
      index: indexName,
      query: {
        match: { [`body.${searchKey}`]: searchValue },
      },
    });
    return result;
  }
}
