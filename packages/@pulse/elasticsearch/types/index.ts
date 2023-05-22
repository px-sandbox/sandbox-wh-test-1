import { Client } from '@elastic/elasticsearch';

export interface IElasticSearchClient {
  getClient(): Client;
  saveOrUpdate(index: string, document: ElasticSearchDocument): Promise<void>;
}

export type ConnectionOptions = {
  host: string;
  username: string;
  password: string;
};

export type ElasticSearchDocument = {
  id: string;
  body: Object;
};
