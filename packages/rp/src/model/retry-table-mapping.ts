import {
  PutCommandInput,
  ScanCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class RetryTableMapping {
  private tableName = Table.processRetry.tableName;

  public prepareDeleteParams(processId: string): DeleteCommandInput {
    return {
      TableName: this.tableName,
      Key: {
        processId,
      },
    };
  }

  public prepareScanParams(): ScanCommandInput {
    return {
      TableName: this.tableName,
      Limit: 200,
      FilterExpression: 'attribute_not_exists(#retry) OR #retry <= :maxRetry',
      ExpressionAttributeNames: {
        '#retry': 'retry',
      },
      ExpressionAttributeValues: {
        ':maxRetry': 3,
      },
    };
  }

  public preparePutParams<T>(processId: string, otherData: T): PutCommandInput {
    return {
      TableName: this.tableName,
      Item: {
        processId,
        ...otherData,
      },
    };
  }
}
