import { Stack } from 'aws-cdk-lib';
import { Function, Queue, use } from 'sst/constructs';
import { commonConfig } from '../common/config';
import { GithubTables } from '../type/tables';

function initProcessRetryFunction(
    stack: Stack,
    githubDDb: GithubTables,
    QueueArray: Queue[]
): Function {
    const { GITHUB_APP_PRIVATE_KEY_PEM, GITHUB_APP_ID, GITHUB_SG_INSTALLATION_ID } =
        use(commonConfig);

    const processRetryFunction = new Function(stack, 'fnRetryFailedProcessor', {
        handler: 'packages/github/src/cron/retry-process.handler',
        bind: [
            githubDDb.retryProcessTable,
            ...QueueArray,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
        ],
    });

    return processRetryFunction;
}

export function initializeFunctions(
    stack: Stack,
    queuesForFunctions: Queue[],
    githubDDb: GithubTables
): Function[] {
    const {
        GITHUB_APP_PRIVATE_KEY_PEM,
        GITHUB_APP_ID,
        GITHUB_SG_INSTALLATION_ID,
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
    } = use(commonConfig);
    const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue, branchCounterFormatterQueue] =
        queuesForFunctions;

    const ghCopilotFunction = new Function(stack, 'fnGithubCopilot', {
        handler: 'packages/github/src/cron/github-copilot.handler',
        bind: [
            ghCopilotFormatDataQueue,
            ghCopilotIndexDataQueue,
            GITHUB_APP_PRIVATE_KEY_PEM,
            GITHUB_APP_ID,
            GITHUB_SG_INSTALLATION_ID,
        ],
    });

    const ghBranchCounterFunction = new Function(stack, 'fnBranchCounter', {
        handler: 'packages/github/src/cron/branch-counter.handler',
        bind: [OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, branchCounterFormatterQueue],
    });

    return [
        ghCopilotFunction,
        ghBranchCounterFunction,
        initProcessRetryFunction(stack, githubDDb, queuesForFunctions),
    ];
}
