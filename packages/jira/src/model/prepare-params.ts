import { PutCommandInput, QueryCommandInput, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { Other } from 'abstraction';
import { Table } from 'sst/node/table';

export class ParamsMapping {
  private tableName = Table['jira-token'].tableName;

  public preparePutParams<T>(processId: string, otherData: T): PutCommandInput {
    return {
      TableName: this.tableName,
      Item: {
        processId,
        ...otherData,
      },
    };
  }

  public prepareScanParams(orgName: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      FilterExpression: 'organizationName = :orgName',
      ExpressionAttributeValues: {
        ':orgName': orgName,
      },
    };
  }
}
