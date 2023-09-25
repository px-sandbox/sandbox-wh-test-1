import { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class ParamsMapping {
  private tableName = Table['jira-creds'].tableName;

  public preparePutParams<T>(id: string, otherData: T): PutCommandInput {
    return {
      TableName: this.tableName,
      Item: {
        id,
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

  public prepareGetParams(id: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      IndexName: 'id',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': id },
    };
  }
}
