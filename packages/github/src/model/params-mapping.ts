import { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Other } from 'abstraction';
import { Table } from 'sst/node/table';

export class ParamsMapping {
  private tableName = Table.GithubMapping.tableName;

  private indexName = Other.Type.ddbGlobalIndex.GitHubIdIndex;

  // Can be generic and move to @pulse/dynamodb package
  public prepareGetParams(id: string): QueryCommandInput {
    return {
      TableName: this.tableName,
      IndexName: this.indexName,
      KeyConditionExpression: 'githubId = :githubId',
      ExpressionAttributeValues: { ':githubId': id },
    };
  }

  public preparePutParams(parentId: string, githubId: string): PutCommandInput {
    return {
      TableName: Table.GithubMapping.tableName,
      Item: {
        parentId: parentId,
        githubId: githubId,
      },
    };
  }
}
