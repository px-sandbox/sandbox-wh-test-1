import { ApiResponse, estypes, RequestParams } from '@elastic/elasticsearch';
import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport';
import { Other } from 'abstraction';

export type SearchResponse<T> = estypes.SearchResponse<T>;
export type EqlHits = estypes.EqlHits;
export type Hit<T> = estypes.Hit<T>;

export type ElasticSearchDocument = {
  id: string;
  body: Record<string, unknown>;
};

export interface IElasticSearchClient {
  putDocument(index: string, document: ElasticSearchDocument): Promise<void>;

  search(indexName: string, query: object): Promise<RequestParams.Search<MultiSearchBody>>;
  queryAggs<T>(indexName: string, query: object): Promise<T>;

  updateDocument(indexName: string, id: string, updatedDoc: object): Promise<void>;
  deleteByQuery(indexName: string | string[], query: object): Promise<void>;
  updateByQuery(indexName: string, query: object, script: object): Promise<void>;
  paginateSearch(indexName: string, query: object): Promise<RequestParams.Search<MultiSearchBody>>;
  bulkInsert(indexName: string, data: { _id: string; body: Other.Type.HitBody }[]): Promise<void>;
  bulkUpdate(
    indexName: string,
    data: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]
  ): Promise<void>;
  isIndexExists(indexName: string): Promise<TransportRequestPromise<ApiResponse<boolean, unknown>>>;
  updateIndex(
    indexName: string,
    body: object
  ): Promise<TransportRequestPromise<ApiResponse<unknown, unknown>>>;
  createIndex(
    indexName: string,
    body: object
  ): Promise<TransportRequestPromise<ApiResponse<unknown, unknown>>>;
}

export type ConnectionOptions = {
  host: string | undefined;
  username: string;
  password: string;
};
