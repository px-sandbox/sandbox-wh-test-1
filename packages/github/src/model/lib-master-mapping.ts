import {
  BatchWriteCommandInput,
  PutCommandInput,
  QueryCommandInput,
  ScanCommandInput,
} from '@aws-sdk/lib-dynamodb';

import { Table } from 'sst/node/table';

export class LibParamsMapping {
  private tableName = Table.libMaster.tableName;

  public preparePutParams<T>(
    items: Array<{ libName: string; version: T }>
  ): BatchWriteCommandInput {
    const putRequests = items.map((item) => ({
      PutRequest: {
        Item: item,
      },
    }));

    return {
      RequestItems: {
        [this.tableName]: putRequests,
      },
    };
  }

  public prepareGetParams(libName: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      KeyConditionExpression: 'libName = :libName',
      ExpressionAttributeValues: { ':libName': libName },
    };
  }

  public prepareScanParams(): ScanCommandInput {
    return {
      TableName: this.tableName,
    };
  }
}
