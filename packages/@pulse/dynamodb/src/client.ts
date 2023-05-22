import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { IDynmoDbDocClient } from '../types';
import { DYNAMODB_LOCAL_URL, translateConfig } from './constants/options';
import { Table } from 'sst/node/table';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class DynamoDbDocClient implements IDynmoDbDocClient {
  private ddbDocClient: DynamoDBDocumentClient;

  constructor(region: string, stage: string) {
    const DbdClient = new DynamoDBClient({
      region,
      endpoint: stage === 'local' ? DYNAMODB_LOCAL_URL : undefined,
    });
    this.ddbDocClient = DynamoDBDocumentClient.from(DbdClient, translateConfig);
  }

  public getDdbDocClient(): DynamoDBDocumentClient {
    return this.ddbDocClient;
  }

  public async find(githubId: string): Promise<any | undefined> {
    const getParams = {
      TableName: Table.GithubMapping.tableName,
      IndexName: 'githubIdIndex',
      KeyConditionExpression: 'githubId = :githubId',
      ExpressionAttributeValues: { ':githubId': githubId },
    };
    const ddbRes = await this.getDdbDocClient().send(new QueryCommand(getParams));
    return ddbRes.Items ? ddbRes.Items[0] : undefined;
  }
}
