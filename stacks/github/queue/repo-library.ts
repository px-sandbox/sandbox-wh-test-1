import { Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

// eslint-disable-next-line max-lines-per-function,
export function initializeRepoLibraryQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig);
    const { retryProcessTable, libMasterTable } = githubDDb;
    const depRegistryQueue = new Queue(stack, 'qDepRegistry');
    depRegistryQueue.addConsumer(stack, {
        function: new Function(stack, 'fnDepRegistry', {
            handler: 'packages/github/src/sqs/handlers/repo-library/dependencies-registry.handler',
            bind: [depRegistryQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });


    const currentDepRegistryQueue = new Queue(stack, 'qCurrentDepRegistry');
    currentDepRegistryQueue.addConsumer(stack, {
        function: new Function(stack, 'fnCurrentDepRegistry', {
            handler: 'packages/github/src/sqs/handlers/repo-library/current-dependencies.handler',
            bind: [currentDepRegistryQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const latestDepRegistry = new Queue(stack, 'qLatestDepRegistry');
    latestDepRegistry.addConsumer(stack, {
        function: new Function(stack, 'fnLatestDepRegistry', {
            handler: 'packages/github/src/sqs/handlers/repo-library/latest-dependencies.handler',
            bind: [libMasterTable],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const masterLibraryQueue = new Queue(stack, 'qMasterLibInfo');
    masterLibraryQueue.addConsumer(stack, {
        function: new Function(stack, 'fnMasterLibrary', {
            handler: 'packages/github/src/sqs/handlers/repo-library/master-library.handler',
            bind: [masterLibraryQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    masterLibraryQueue.bind([
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        latestDepRegistry,
    ]);

    currentDepRegistryQueue.bind([
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);

    depRegistryQueue.bind([
        retryProcessTable,
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        currentDepRegistryQueue,
        latestDepRegistry,
    ]);

    return [depRegistryQueue, currentDepRegistryQueue, latestDepRegistry, masterLibraryQueue]
}
