import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export interface IDynmoDbDocClient {
  getDdbDocClient(): DynamoDBDocumentClient;
}
