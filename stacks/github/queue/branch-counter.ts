import { Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initializeBranchCounterQueue(stack: Stack, githubDDB: GithubTables): Queue[] {
    const branchCounterIndexQueue = new Queue(stack, 'qGhActiveBranchCounterIndex');
    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, NODE_VERSION } = use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDB;
    branchCounterIndexQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhActiveBranchCounterIndex', {
            handler: 'packages/github/src/sqs/handlers/indexer/active-branch.handler',
            bind: [
                OPENSEARCH_NODE,
                OPENSEARCH_PASSWORD,
                OPENSEARCH_USERNAME,
                retryProcessTable,
                githubMappingTable,
                branchCounterIndexQueue,
            ],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const branchCounterFormatterQueue = new Queue(stack, 'qGhActiveBranchCounterFormat');

    branchCounterFormatterQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhActiveBranchCounterFormat', {
            handler: 'packages/github/src/sqs/handlers/formatter/active-branch.handler',
            bind: [
                OPENSEARCH_NODE,
                OPENSEARCH_PASSWORD,
                OPENSEARCH_USERNAME,
                branchCounterFormatterQueue,
                branchCounterIndexQueue,
                retryProcessTable,
                githubMappingTable,
            ],
            runtime: NODE_VERSION,
        }),

        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [branchCounterFormatterQueue, branchCounterIndexQueue];
}