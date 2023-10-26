import { Stack } from "aws-cdk-lib";
import { Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initializeUserQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
    const userIndexDataQueue = new Queue(stack, 'gh_users_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/user.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    const userFormatDataQueue = new Queue(stack, 'gh_users_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/user.handler',
                bind: [userIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    userFormatDataQueue.bind([
        githubDDb.githubMappingTable,
        githubDDb.retryProcessTable,
        userIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);
    userIndexDataQueue.bind([
        githubDDb.githubMappingTable,
        githubDDb.retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [userFormatDataQueue, userIndexDataQueue]
}