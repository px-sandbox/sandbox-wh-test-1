import { PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Table } from 'sst/node/table';
import { logger } from 'core';

export class JiraCredsMapping {
  private tableName = Table.jiraCreds.tableName;

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
    logger.info('JiraCredsMapping.prepareGetParams');

    return {
      TableName: this.tableName,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': id },
    };
  }
}
