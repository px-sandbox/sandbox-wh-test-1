import { Client } from '@elastic/elasticsearch';

export type ElasticSearchDocument = {
  id: string;
  body: Object;
};

export interface IElasticSearchClient {
  getClient(): Client;
  putDocument(index: string, document: ElasticSearchDocument): Promise<void>;
}

export type ConnectionOptions = {
  host?: string;
  username?: string;
  password?: string;
};
