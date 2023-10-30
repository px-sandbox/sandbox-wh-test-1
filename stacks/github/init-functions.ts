import { Stack } from "aws-cdk-lib";
import { Function, Queue, use } from "sst/constructs";
import { commonConfig } from "../common/config";
import { GithubTables } from "../type/tables";


export function initializeFunctions(stack: Stack, queuesForFunctions: Queue[], githubDDb: GithubTables): Function[] {

    const { GITHUB_APP_PRIVATE_KEY_PEM, GITHUB_APP_ID, GITHUB_SG_INSTALLATION_ID, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } = use(commonConfig)

    const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue, branchCounterFormatterQueue, userIndexDataQueue, userFormatDataQueue, repoIndexDataQueue, repoFormatDataQueue, branchIndexDataQueue, branchFormatDataQueue, prIndexDataQueue, prFormatDataQueue, commitIndexDataQueue, commitFormatDataQueue, pushIndexDataQueue, pushFormatDataQueue, prReviewCommentIndexDataQueue, prReviewCommentFormatDataQueue, afterRepoSaveQueue, prReviewIndexDataQueue, prReviewFormatDataQueue, collectPRData, collectReviewsData, collecthistoricalPrByumber, collectCommitsData, historicalBranch, collectPRCommitsData, collectPRReviewCommentsData,
        branchCounterIndexQueue, ghMergedCommitProcessQueue] = queuesForFunctions;

    const ghCopilotFunction = new Function(stack, 'github-copilot', {
        handler: 'packages/github/src/cron/github-copilot.handler',
        bind: [
            ghCopilotFormatDataQueue,
            ghCopilotIndexDataQueue,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
        ],
    });

    const ghBranchCounterFunction = new Function(stack, 'branch-counter', {
        handler: 'packages/github/src/cron/branch-counter.handler',
        bind: [OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, branchCounterFormatterQueue],
    });

    const processRetryFunction = new Function(stack, 'retry-failed-processor', {
        handler: 'packages/github/src/cron/retry-process.handler',
        bind: [
            githubDDb.retryProcessTable,
            userIndexDataQueue,
            userFormatDataQueue,
            repoIndexDataQueue,
            repoFormatDataQueue,
            branchIndexDataQueue,
            branchFormatDataQueue,
            prIndexDataQueue,
            prFormatDataQueue,
            commitIndexDataQueue,
            commitFormatDataQueue,
            pushIndexDataQueue,
            pushFormatDataQueue,
            prReviewCommentIndexDataQueue,
            prReviewCommentFormatDataQueue,
            afterRepoSaveQueue,
            prReviewIndexDataQueue,
            prReviewFormatDataQueue,
            collectPRData,
            collectReviewsData,
            collecthistoricalPrByumber,
            collectCommitsData,
            historicalBranch,
            collectPRCommitsData,
            collectPRReviewCommentsData,
            branchCounterIndexQueue,
            branchCounterFormatterQueue,
            ghMergedCommitProcessQueue,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
        ],
    });
    return [ghCopilotFunction, ghBranchCounterFunction, processRetryFunction]

}