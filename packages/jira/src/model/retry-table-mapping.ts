import { PutCommandInput, ScanCommandInput, DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class RetryTableMapping {
  private tableName = Table['process-jira-retry'].tableName;

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
