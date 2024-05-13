import {
  BatchGetCommandInput,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  PutCommandInput,
  QueryCommandInput,
  ScanCommandInput,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';

export interface IDynmoDbDocClient {
  ddbDocClient: DynamoDBDocumentClient;
  dynamoDbLocalURL: string;
  region: string | undefined;

  getDdbDocClient(): DynamoDBDocumentClient;
  find(getParams: QueryCommandInput): Promise<Record<string, unknown> | undefined>;
  batchGet<T>(params: BatchGetCommandInput): Promise<T | undefined>;
  put(putParams: PutCommandInput): Promise<void>;
  delete(deleteParams: DeleteCommandInput): Promise<void>;
  scanAllItems(scanParams: ScanCommandInput): Promise<ScanCommandOutput>;
  scan(scanParams: ScanCommandInput): Promise<ScanCommandOutput>;
}
