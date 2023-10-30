import { Duration, Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { GithubTables } from "../../type/tables";
import { commonConfig } from "../../common/config";

export function initailizeCommitQueue(stack: Stack, githubDDb: GithubTables): Queue[] {
    const { GIT_ORGANIZATION_ID, GITHUB_APP_PRIVATE_KEY_PEM, GITHUB_APP_ID, GITHUB_SG_INSTALLATION_ID, OPENSEARCH_NODE, OPENSEARCH_USERNAME, OPENSEARCH_PASSWORD } = use(commonConfig);

    const commitIndexDataQueue = new Queue(stack, 'gh_commit_index');
    commitIndexDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_commit_index_func', {
            handler: 'packages/github/src/sqs/handlers/indexer/commit.handler',
            bind: [commitIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });
    const commitFormatDataQueue = new Queue(stack, 'gh_commit_format', {
        cdk: {
            queue: {
                fifo: true,
            },
        },
    });
    commitFormatDataQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_commit_format_func', {
            handler: 'packages/github/src/sqs/handlers/formatter/commit.handler',
            bind: [commitFormatDataQueue, commitIndexDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const ghMergedCommitProcessQueue = new Queue(stack, 'gh_merge_commit_process');
    ghMergedCommitProcessQueue.addConsumer(stack, {
        function: new Function(stack, 'gh_merge_commit_process_func', {
            handler: 'packages/github/src/sqs/handlers/merge-commit.handler',
            bind: [ghMergedCommitProcessQueue, commitFormatDataQueue],
        }),
        cdk: {
            eventSource: {
                batchSize: 5,
            },
        },
    });

    const commitFileChanges = new Queue(stack, 'gh_commit_file_changes', {
        cdk: {
            queue: {
                visibilityTimeout: Duration.seconds(600),
            },
        },
    });
    commitFileChanges.addConsumer(stack, {
        function: new Function(stack, 'commitFileChangesFunc', {
            handler: 'packages/github/src/sqs/handlers/historical/migrate-commit-file-changes.handler',
            timeout: '300 seconds',
            runtime: 'nodejs18.x',
            bind: [
                commitIndexDataQueue,
                commitFileChanges,
                GITHUB_SG_INSTALLATION_ID,
                GITHUB_APP_PRIVATE_KEY_PEM,
                GITHUB_APP_ID,
                githubDDb.githubMappingTable,
                githubDDb.retryProcessTable,
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

    commitFormatDataQueue.bind([
        githubDDb.githubMappingTable,
        githubDDb.retryProcessTable,
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
        githubDDb.githubMappingTable,
        githubDDb.retryProcessTable,
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_USERNAME,
        OPENSEARCH_PASSWORD,
        ghMergedCommitProcessQueue,
        commitFormatDataQueue,
    ]);

    commitIndexDataQueue.bind([
        githubDDb.githubMappingTable,
        githubDDb.retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    ]);

    return [commitFormatDataQueue, commitIndexDataQueue, ghMergedCommitProcessQueue, commitFileChanges]
}