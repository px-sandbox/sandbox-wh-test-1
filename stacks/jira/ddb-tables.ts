import { Table } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';

export function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
  const jiraMappingTable = new Table(stack, 'jiraMapping', {
    fields: {
      parentId: 'string',
      jiraId: 'string',
    },
    globalIndexes: {
      jiraIndex: { partitionKey: 'jiraId' },
    },
    primaryIndex: { partitionKey: 'parentId' },
  });
  const jiraCredsTable = new Table(stack, 'jiraCreds', {
    fields: {
      id: 'string',
    },
    primaryIndex: { partitionKey: 'id' },
  });

  const processJiraRetryTable = new Table(stack, 'jiraProcessRetry', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });

  return {
    jiraMappingTable,
    jiraCredsTable,
    processJiraRetryTable,
  };
}
