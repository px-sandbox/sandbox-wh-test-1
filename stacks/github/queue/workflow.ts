import { Stack } from "aws-cdk-lib";
import { Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initializeWorkflowQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
    const { retryProcessTable } = githubDDb;
    const currentDepRegistryQueue = new Queue(stack, 'qCurrentDepRegistry', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/workflow/current-dependencies.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    currentDepRegistryQueue.bind([
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [currentDepRegistryQueue]
}