import { Stack } from 'aws-cdk-lib';
import { Queue, use } from 'sst/constructs';
import { GithubTables } from '../../type/tables';
import { commonConfig } from '../../common/config';

export function initializeRepoQueue(
    stack: Stack,
    githubDDb: GithubTables,
    branchFormatDataQueue: Queue,
    branchIndexDataQueue: Queue
): Queue[] {
    const {
        GIT_ORGANIZATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        GITHUB_APP_ID,
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_SG_INSTALLATION_ID,
    } = use(commonConfig);
    const { retryProcessTable, githubMappingTable } = githubDDb;
    const repoIndexDataQueue = new Queue(stack, 'gh_repo_index', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/indexer/repo.handler',
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });
    const repoFormatDataQueue = new Queue(stack, 'gh_repo_format', {
        consumer: {
            function: {
                handler: 'packages/github/src/sqs/handlers/formatter/repo.handler',
                bind: [repoIndexDataQueue],
            },
            cdk: {
                eventSource: {
                    batchSize: 5,
                },
            },
        },
    });

    const afterRepoSaveQueue = new Queue(stack, 'gh_after_repo_save', {
        consumer: {
            function: 'packages/github/src/sqs/handlers/save-branches.handler',
            cdk: {
                eventSource: {
                    batchSize: 1,
                },
            },
        },
    });

    repoFormatDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        repoIndexDataQueue,
        GIT_ORGANIZATION_ID,
    ]);

    repoIndexDataQueue.bind([
        githubMappingTable,
        retryProcessTable,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        afterRepoSaveQueue,
    ]);

    afterRepoSaveQueue.bind([
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        branchFormatDataQueue,
        branchIndexDataQueue,
    ]);
    return [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue];
}
