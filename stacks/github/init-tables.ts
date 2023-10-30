import { Stack } from "aws-cdk-lib";
import { Table } from "sst/constructs";

export function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
    const tables = {} as Record<string, Table>;
    tables.githubMappingTable = new Table(stack, 'GithubMapping', {
        fields: {
            parentId: 'string',
            githubId: 'string',
        },
        globalIndexes: {
            githubIndex: { partitionKey: 'githubId' },
        },
        primaryIndex: { partitionKey: 'parentId' },
    });
    tables.retryProcessTable = new Table(stack, 'process-retry', {
        fields: {
            processId: 'string',
        },
        primaryIndex: { partitionKey: 'processId' },
    });
    return tables;
}