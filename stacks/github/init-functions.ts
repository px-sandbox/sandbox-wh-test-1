/* eslint-disable max-lines-per-function */
import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { GithubTables } from '../type/tables';

function initProcessRetryFunction(
    stack: Stack,
    queues: { [key: string]: Queue },
    githubDDb: GithubTables,
): Function {// eslint-disable-line @typescript-eslint/ban-types
    const { GITHUB_APP_PRIVATE_KEY_PEM, GITHUB_APP_ID, GITHUB_SG_INSTALLATION_ID, NODE_VERSION } =
        use(commonConfig);
    const { retryProcessTable } = githubDDb;
    const {
        branchFormatDataQueue,
        ghCopilotFormatDataQueue,
        collectCommitsData,
        collectPRCommitsData,
        collectPRData,
        collectPRReviewCommentsData,
        collectReviewsData,
        historicalBranch,
        collecthistoricalPrByumber,
        pushFormatDataQueue,
        repoFormatDataQueue,
        afterRepoSaveQueue,
        userFormatDataQueue,
        commitFileChanges,
        commitFormatDataQueue,
        prFormatDataQueue,
        branchCounterFormatterQueue,
        prReviewCommentFormatDataQueue,
        prReviewFormatDataQueue,
        depRegistryQueue,
        currentDepRegistryQueue,
        latestDepRegistry,
        masterLibraryQueue,
        repoSastErrors,
        scansSaveQueue,
        ghMergedCommitProcessQueue,
        repoLibS3Queue
    } = queues;

    // we need to bind all necessary queues to the function
    const processRetryFunction = new Function(stack, 'fnRetryFailedProcessor', {
        handler: 'packages/github/src/cron/retry-process.handler',
        timeout: '60 seconds',
        bind: [
            retryProcessTable,
            branchFormatDataQueue,
            ghCopilotFormatDataQueue,
            collectCommitsData,
            collectPRCommitsData,
            collectPRData,
            collectPRReviewCommentsData,
            collectReviewsData,
            historicalBranch,
            collecthistoricalPrByumber,
            pushFormatDataQueue,
            repoFormatDataQueue,
            afterRepoSaveQueue,
            userFormatDataQueue,
            commitFileChanges,
            commitFormatDataQueue,
            prFormatDataQueue,
            branchCounterFormatterQueue,
            prReviewCommentFormatDataQueue,
            prReviewFormatDataQueue,
            depRegistryQueue,
            currentDepRegistryQueue,
            latestDepRegistry,
            masterLibraryQueue,
            repoSastErrors,
            scansSaveQueue,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
            ghMergedCommitProcessQueue,
            repoLibS3Queue
        ],
        runtime: NODE_VERSION,

    });

    return processRetryFunction;
}

export function initializeFunctions(
    stack: Stack,
    queuesForFunctions: { [key: string]: Queue },
    githubDDb: GithubTables
): Record<string, Function> {// eslint-disable-line @typescript-eslint/ban-types
    const {
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        NODE_VERSION,
    } = use(commonConfig);

    const {
        ghCopilotFormatDataQueue,
        ghCopilotIndexDataQueue,
        branchCounterFormatterQueue,
        masterLibraryQueue,
    } = queuesForFunctions;

    const ghCopilotFunction = new Function(stack, 'fnGithubCopilot', {
        handler: 'packages/github/src/cron/github-copilot.handler',
        bind: [
            ghCopilotFormatDataQueue,
            ghCopilotIndexDataQueue,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
        ],
        runtime: NODE_VERSION,
    });

    const ghBranchCounterFunction = new Function(stack, 'fnBranchCounter', {
        handler: 'packages/github/src/cron/branch-counter.handler',
        bind: [OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, branchCounterFormatterQueue],
        runtime: NODE_VERSION,
    });

    const initProcessRetry = initProcessRetryFunction(stack, queuesForFunctions, githubDDb);

    const ghUpdateLatestDepOnDDBFunction = new Function(stack, 'fnUpdateLatestDepOnDDB', {
        handler: 'packages/github/src/cron/update-latest-dep.handler',
        timeout: '300 seconds',
        bind: [githubDDb.libMasterTable, masterLibraryQueue],
        runtime: NODE_VERSION,
    });

    return {
        ghCopilotFunction,
        ghBranchCounterFunction,
        processRetryFunction: initProcessRetry,
        ghUpdateLatestDepOnDDBFunction,
    };

}
