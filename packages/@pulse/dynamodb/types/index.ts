import { DynamoDBDocumentClient, QueryCommandInput } from '@aws-sdk/lib-dynamodb';

export interface IDynmoDbDocClient {
  getDdbDocClient(): DynamoDBDocumentClient;
  find(getParams: QueryCommandInput): Promise<Record<string, any> | undefined>;
}
