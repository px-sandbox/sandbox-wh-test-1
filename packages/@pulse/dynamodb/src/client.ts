import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import { IDynmoDbDocClient } from '../types';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

export class DynamoDbDocClient implements IDynmoDbDocClient {
  private ddbDocClient: DynamoDBDocumentClient;

  private marshallOptions = {
    // Whether to automatically convert empty strings, blobs, and sets to `null`.
    convertEmptyValues: true, // false, by default.
    // Whether to remove undefined values while marshalling.
    removeUndefinedValues: false, // false, by default.
    // Whether to convert typeof object to map attribute.
    convertClassInstanceToMap: false, // false, by default.
  };

  private unmarshallOptions = {
    // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
    wrapNumbers: false, // false, by default.
  };

  private translateConfig = {
    marshallOptions: this.marshallOptions,
    unmarshalOptions: this.unmarshallOptions,
  };

  private dynamoDbLocalURL = 'http://localhost:8000';

  constructor(region: string | undefined, stage: string) {
    const DbdClient = new DynamoDBClient({
      region,
      endpoint: stage === 'local' ? this.dynamoDbLocalURL : undefined,
    });
    this.ddbDocClient = DynamoDBDocumentClient.from(DbdClient, this.translateConfig);
  }

  public getDdbDocClient(): DynamoDBDocumentClient {
    return this.ddbDocClient;
  }

  public async find(getParams: QueryCommandInput): Promise<Record<string, any> | undefined> {
    const ddbRes = await this.getDdbDocClient().send(new QueryCommand(getParams));
    return ddbRes.Items ? ddbRes.Items[0] : undefined;
  }

  public async put(putParams: PutCommandInput): Promise<void> {
    await this.getDdbDocClient().send(new PutCommand(putParams));
  }
}
