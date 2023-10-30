import { Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initializeBranchCounterQueue(stack: Stack, githubDDB: GithubTables): Queue[] {
    const branchCounterIndexQueue = new Queue(stack, 'gh_active_branch_counter_index');
    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);

    branchCounterIndexQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_active_branch_counter_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/active-branch.handler',
            bind: [
                OPENSEARCH_NODE,
                OPENSEARCH_PASSWORD,
                OPENSEARCH_USERNAME,
                githubDDB.retryProcessTable,
                githubDDB.githubMappingTable,
                branchCounterIndexQueue,
            ],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const branchCounterFormatterQueue = new Queue(stack, 'gh_active_branch_counter_format');

    branchCounterFormatterQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_active_branch_counter_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/active-branch.handler',
            bind: [
                OPENSEARCH_NODE,
                OPENSEARCH_PASSWORD,
                OPENSEARCH_USERNAME,
                branchCounterFormatterQueue,
                branchCounterIndexQueue,
                githubDDB.retryProcessTable,
                githubDDB.githubMappingTable,
            ],
        }),

        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    return [branchCounterFormatterQueue, branchCounterIndexQueue];
}