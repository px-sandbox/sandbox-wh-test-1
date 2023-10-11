import { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Other } from 'abstraction';
import { Table } from 'sst/node/table';

export class ParamsMapping {
  private tableName = Table.jiraMapping.tableName;

  private indexName = Other.Type.ddbGlobalIndex.JiraIdIndex;

  public prepareGetParams(id: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression: 'jiraId = :jiraId',
      ExpressionAttributeValues: { ':jiraId': id },
    };
  }

  public preparePutParams(parentId: string, jiraId: string, organization: string): PutCommandInput {
    return {
      TableName: Table.jiraMapping.tableName,
      Item: {
        parentId,
        jiraId,
        organization,
      },
    };
  }
}
