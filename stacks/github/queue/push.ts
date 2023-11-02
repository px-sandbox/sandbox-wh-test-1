import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializePushQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } =
        use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const pushIndexDataQueue = new Queue(stack, 'qGhPushIndex');
    pushIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPushIndex', {
            handler: 'packages/github/src/sqs/handlers/indexer/push.handler',
            bind: [pushIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const pushFormatDataQueue = new Queue(stack, 'qGhPushFormat');
    pushFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhPushFormat', {
            handler: 'packages/github/src/sqs/handlers/formatter/push.handler',
            bind: [pushFormatDataQueue, pushIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    pushFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        pushIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);
    pushIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [pushFormatDataQueue, pushIndexDataQueue];
}
