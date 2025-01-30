import { DeleteCommandInput, PutCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
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

  public prepareScanParams(limit?: boolean, queue?: string): ScanCommandInput {
    let FilterExpression = 'attribute_not_exists(#retry) OR #retry <= :maxRetry';
    const ExpressionAttributeNames = {
      '#retry': 'retry',
    };
    const ExpressionAttributeValues = { ':maxRetry': 3 };

    if (queue) {
      FilterExpression += ' AND #queue = :queue';
      ExpressionAttributeNames['#queue'] = 'queue';
      ExpressionAttributeValues[':queue'] = queue;
    }
    return {
      TableName: this.tableName,
      Limit: limit ? 200 : undefined,
      FilterExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
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
