import { Duration, Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

// eslint-disable-next-line max-lines-per-function
export function initializeCommitQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const {
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
        NODE_VERSION,
    } = use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const commitIndexDataQueue = new Queue(stack, 'qGhCommitIndex');
    commitIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhCommitIndex', {
            handler: 'packages/github/src/sqs/handlers/indexer/commit.handler',
            bind: [commitIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const commitFormatDataQueue = new Queue(stack, 'qGhCommitFormat', {
        cdk: {
            queue: {
                fifo: true,
            },
        },
    });
    commitFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhCommitFormat', {
            handler: 'packages/github/src/sqs/handlers/formatter/commit.handler',
            bind: [commitFormatDataQueue, commitIndexDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const ghMergedCommitProcessQueue = new Queue(stack, 'qGhMergeCommitProcess');
    ghMergedCommitProcessQueue.addConsumer(stack, {
        function: new Function(stack, 'fnGhMergeCommitProcess', {
            handler: 'packages/github/src/sqs/handlers/merge-commit.handler',
            bind: [ghMergedCommitProcessQueue, commitFormatDataQueue],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const commitFileChanges = new Queue(stack, 'qGhCommitFileChanges', {
        cdk: {
            queue: {
                visibilityTimeout: Duration.seconds(600),
            },
        },
    });
    commitFileChanges.addConsumer(stack, {
        function: new Function(stack, 'fnCommitFileChanges', {
            handler: 'packages/github/src/sqs/handlers/historical/migrate-commit-file-changes.handler',
            timeout: '300 seconds',
            runtime: NODE_VERSION,
            bind: [
                commitIndexDataQueue,
                commitFileChanges,
                GITHUB_SG_INSTALLATION_ID,
                GITHUB_APP_PRIVATE_KEY_PEM,
                GITHUB_APP_ID,
                githubMappingTable,
                retryProcessTable,
                GIT_ORGANIZATION_ID,
                OPENSEARCH_NODE,
                OPENSEARCH_PASSWORD,
                OPENSEARCH_USERNAME,
            ],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });


    const updateMergeCommit = new Queue(stack, 'qUpdateMergeCommit');
    updateMergeCommit.addConsumer(stack, {
        function: new Function(stack, 'fnUpdateMergeCommit', {
            handler: 'packages/github/src/sqs/handlers/historical/merge-commit-update.handler',
            bind: [updateMergeCommit],
            runtime: NODE_VERSION,
        }),
        cdk: {
            eventSource: {
                batchSize: 1,
            },
        },
    });

    commitFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        commitIndexDataQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
    ]);

    ghMergedCommitProcessQueue.bind([
        githubMappingTable,
        retryProcessTable,
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
        ghMergedCommitProcessQueue,
        commitFormatDataQueue,
    ]);

    commitIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);
    updateMergeCommit.bind([
        githubMappingTable,
        retryProcessTable,
        commitIndexDataQueue,
        GIT_ORGANIZATION_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
    ]);

    return [
        commitFormatDataQueue,
        commitIndexDataQueue,
        ghMergedCommitProcessQueue,
        commitFileChanges,
        updateMergeCommit
    ];
}
