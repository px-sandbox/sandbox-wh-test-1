import { PutCommandInput, ScanCommandInput, DeleteCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class RetryTableMapping {
  private tableName = Table.RetryProcesses.tableName;

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

  public preparePutParams(processId: string, otherData: any): PutCommandInput {
    return {
      TableName: this.tableName,
      Item: {
        processId,
        ...(otherData ?? {}),
      },
    };
  }
}
