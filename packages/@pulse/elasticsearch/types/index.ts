import { Client } from '@elastic/elasticsearch';

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
