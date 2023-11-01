import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializePrQueue(
    stack: Stack,
    ghMergedCommitProcessQueue: Queue,
    githubDDb: GithubTables
): Queue[] {
    const { GIT_ORGANIZATION_ID, OPENSEARCH_NODE, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD } =
        use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const prIndexDataQueue = new Queue(stack, 'gh_pr_index');
    prIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
            bind: [prIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const prFormatDataQueue = new Queue(stack, 'gh_pr_format');
    prFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_pr_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
            timeout: '30 seconds',
            bind: [prFormatDataQueue, prIndexDataQueue, ghMergedCommitProcessQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    prFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        prIndexDataQueue,
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
        ghMergedCommitProcessQueue,
    ]);

    prIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    return [prFormatDataQueue, prIndexDataQueue];
}
