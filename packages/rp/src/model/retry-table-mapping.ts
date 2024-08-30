import { PutCommandInput, ScanCommandInput, DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
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

  public prepareScanParams(processIdArr?: string[]): ScanCommandInput {
    let filterExpression = 'attribute_not_exists(#retry) OR #retry <= :maxRetry';
    let expressionAttributeValues: { ':maxRetry': number; ':processId'?: string[] } = {
      ':maxRetry': 3,
    };
    let expressionAttributeNames: { '#retry': string; '#processId'?: string } = {
      '#retry': 'retry',
    };
    if (processIdArr && processIdArr.length > 0) {
      filterExpression += ' AND #processId IN (:processId)';
      expressionAttributeValues[':processId'] = processIdArr;
      expressionAttributeNames['#processId'] = 'processId';
    }

    return {
      TableName: this.tableName,
      Limit: 200,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
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
