import { Stack } from "aws-cdk-lib";
import { Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";


export function initializeBranchQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const branchIndexDataQueue = new Queue(stack, 'gh_branch_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/branch.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    const branchFormatDataQueue = new Queue(stack, 'gh_branch_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/branch.handler',
                bind: [branchIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    branchFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        branchIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);

    branchIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [branchFormatDataQueue, branchIndexDataQueue]
}