import {
  DynamoDBDocumentClient,
  QueryCommandInput,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
export interface IDynmoDbDocClient {
  getDdbDocClient(): DynamoDBDocumentClient;
  find(getParams: QueryCommandInput): Promise<QueryCommandOutput>;
}
