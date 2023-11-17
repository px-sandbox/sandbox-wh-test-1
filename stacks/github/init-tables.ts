import { Stack } from "aws-cdk-lib";
import { Table } from "sst/constructs";

export function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
    const githubMappingTable = new Table(stack, 'GithubMapping', {
        fields: {
            parentId: 'string',
            githubId: 'string',
        },
        globalIndexes: {
            githubIndex: { partitionKey: 'githubId' },
        },
        primaryIndex: { partitionKey: 'parentId' },
    });
    const retryProcessTable = new Table(stack, 'process-retry', {
        fields: {
            processId: 'string',
        },
        primaryIndex: { partitionKey: 'processId' },
    });
    const libMasterTable = new Table(stack, 'libMaster', {
        fields: {
            libName: 'string',
        },
        primaryIndex: { partitionKey: 'libName' },
    });
    return { githubMappingTable, retryProcessTable, libMasterTable };
}