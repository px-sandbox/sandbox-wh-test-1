import { Table } from 'sst/constructs';
import { Stack } from 'aws-cdk-lib';

export function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
    const tables = {} as Record<string, Table>;
    tables.jiraMappingTable = new Table(stack, 'jiraMapping', {
        fields: {
            parentId: 'string',
            jiraId: 'string'
        },
        globalIndexes: {
            jiraIndex: { partitionKey: 'jiraId' }
        },
        primaryIndex: { partitionKey: 'parentId' },
    });
    tables.jiraCredsTable = new Table(stack, 'jiraCreds', {
        fields: {
            id: 'string',
        },
        primaryIndex: { partitionKey: 'id' },
    });

    tables.processJiraRetryTable = new Table(stack, 'jiraProcessRetry', {
        fields: {
            processId: 'string',
        },
        primaryIndex: { partitionKey: 'processId' },
    });

    return tables;
}