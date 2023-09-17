import { PutCommandInput, ScanCommandInput, DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class RetryTableMapping {
  private tableName = Table['process-retry'].tableName;

  public prepareDeleteParams(processId: string): DeleteCommandInput {
    return {
      TableName: this.tableName,
      Key: {
        processId,
      },
    };
  }

  public prepareScanParams(limit: number): ScanCommandInput {
    return {
      TableName: this.tableName,
      Limit: limit,
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
