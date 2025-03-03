// import { ApiResponse, estypes, RequestParams } from '@elastic/elasticsearch';
// import { MultiSearchBody } from '@elastic/elasticsearch/api/types';
import { Other } from 'abstraction';
import type { IndicesExistsResponse, IndicesPutMappingResponse, IndicesCreateResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SearchResponse as ESSearchResponse } from '@elastic/elasticsearch/lib/api/types';

export type SearchResponse<T> = ESSearchResponse<T>;
export type EqlHits = any;
export type Hit<T> = {
  _index: string;
  _id: string;
  _score: number;
  _source: T;
};

export type ElasticSearchDocument = {
  id: string;
  body: Record<string, unknown>;
};

export interface IElasticSearchClient {
  putDocument(index: string, document: ElasticSearchDocument): Promise<void>;

  search(indexName: string, query: object): Promise<SearchResponse<unknown>>;
  queryAggs<T>(indexName: string, query: object): Promise<T>;

  updateDocument(indexName: string, id: string, updatedDoc: object): Promise<void>;
  deleteByQuery(indexName: string | string[], query: object): Promise<void>;
  updateByQuery(indexName: string, query: object, script: object): Promise<void>;
  paginateSearch(indexName: string, query: object): Promise<SearchResponse<unknown>>;
  bulkInsert(indexName: string, data: { _id: string; body: Other.Type.HitBody }[]): Promise<void>;
  bulkUpdate(
    indexName: string,
    data: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]
  ): Promise<void>;
  isIndexExists(indexName: string): Promise<IndicesExistsResponse>;
  updateIndex(
    indexName: string,
    body: object
  ): Promise<IndicesPutMappingResponse>;
  createIndex(
    indexName: string,
    body: object
  ): Promise<IndicesCreateResponse>;
}

export type ConnectionOptions = {
  host: string | undefined;
  username: string;
  password: string;
};
