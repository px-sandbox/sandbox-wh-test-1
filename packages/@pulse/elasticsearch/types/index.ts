import { Client, estypes } from '@elastic/elasticsearch';

export type SearchResponse<T> = estypes.SearchResponse<T>;
export type EqlHits = estypes.EqlHits;
export type Hit<T> = estypes.Hit<T>;

export type ElasticSearchDocument = {
  id: string;
  body: Record<string, unknown>;
};

export interface IElasticSearchClient {
  getClient(): Client;
  putDocument(index: string, document: ElasticSearchDocument): Promise<void>;
}

export type ConnectionOptions = {
  host: string | undefined;
  username: string;
  password: string;
};
