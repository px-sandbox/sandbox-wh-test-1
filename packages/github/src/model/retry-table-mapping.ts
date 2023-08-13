import { PutCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';

export class RetryTableMapping {
  private tableName = Table.RetryProcesses.tableName;

  //   private indexName = 'processId';

  // Can be generic and move to @pulse/dynamodb package
  //   public prepareGetParams(id: string): QueryCommandInput {
  //     return {
  //       TableName: this.tableName,
  //       IndexName: this.indexName,
  //       KeyConditionExpression: 'githubId = :githubId',
  //       ExpressionAttributeValues: { ':githubId': id },
  //     };
  //   }

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
