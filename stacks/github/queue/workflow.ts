import { Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initializeWorkflowQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
    const { retryProcessTable } = githubDDb;
    const depRegistryQueue = new Queue(stack, 'qDepRegistry');
    depRegistryQueue.addConsumer(stack, {
        function: new Function(stack, 'fnDepRegistry', {
            handler: 'packages/github/src/sqs/handlers/workflow/dependencies-registry.handler',
            bind: [depRegistryQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    depRegistryQueue.bind([
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    const currentDepRegistryQueue = new Queue(stack, 'qCurrentDepRegistry');
    currentDepRegistryQueue.addConsumer(stack, {
        function: new Function(stack, 'fnCurrentDepRegistry', {
            handler: 'packages/github/src/sqs/handlers/workflow/current-dependencies.handler',
            bind: [currentDepRegistryQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    currentDepRegistryQueue.bind([
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [depRegistryQueue, currentDepRegistryQueue]
}
