import { Api, Function, StackContext, use } from 'sst/constructs';
import { commonConfig } from './common/config';
import { initializeCron } from './github/init-crons';
import { initializeFunctions } from './github/init-functions';
import { initializeDynamoDBTables } from './github/init-tables';
import { initializeBranchQueue } from './github/queue/branch';
import { initializeBranchCounterQueue } from './github/queue/branch-counter';
import { initializeCommitQueue } from './github/queue/commit';
import { initializeCopilotQueue } from './github/queue/copilot';
import { initializeMigrationQueue } from './github/queue/migrate';
import { initializePrQueue } from './github/queue/pr';
import { initializePushQueue } from './github/queue/push';
import { initializeRepoQueue } from './github/queue/repo';
import { initializePrReviewAndCommentsQueue } from './github/queue/review';
import { initializeUserQueue } from './github/queue/user';

// eslint-disable-next-line max-lines-per-function,
export function gh({ stack }: StackContext): {
  ghAPI: Api<{
    // eslint-disable-next-line @typescript-eslint/ban-types
    universal: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
    // eslint-disable-next-line @typescript-eslint/ban-types
    admin: { type: 'lambda'; responseTypes: 'simple'[]; function: Function };
  }>;
} {
  const { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME, AUTH_PUBLIC_KEY } = use(commonConfig);
  // Destructure secrets
  const {
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_BASE_URL,
    GITHUB_SG_INSTALLATION_ID,
    GITHUB_WEBHOOK_SECRET,
    GITHUB_SG_ACCESS_TOKEN,
    // AUTH_PUBLIC_KEY,
    GIT_ORGANIZATION_ID,
  } = use(commonConfig);

  /** Initialize DynamoDB Tables
   * 
   */
  const { githubMappingTable, retryProcessTable } = initializeDynamoDBTables(stack);

  /**
   *  Initialize Queues
   * 
   * 
   * Queue to format and index user data
   */
  const [userFormatDataQueue, userIndexDataQueue] = initializeUserQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index branch data
   */
  const [branchFormatDataQueue, branchIndexDataQueue] = initializeBranchQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index repo data
   */
  const [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue] = initializeRepoQueue(stack, { githubMappingTable, retryProcessTable }, branchFormatDataQueue, branchIndexDataQueue);

  /**
   * Queue to format and index commit data
   */
  const [commitFormatDataQueue, commitIndexDataQueue, ghMergedCommitProcessQueue, commitFileChanges] = initializeCommitQueue(stack, { githubMappingTable, retryProcessTable },);

  /**
   * Queue to format and index PR data
   */
  const [prFormatDataQueue, prIndexDataQueue] = initializePrQueue(stack, ghMergedCommitProcessQueue, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index push data
   */
  const [pushFormatDataQueue, pushIndexDataQueue] = initializePushQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index PR review and comment data
   */
  const [prReviewIndexDataQueue, prReviewFormatDataQueue, prReviewCommentFormatDataQueue, prReviewCommentIndexDataQueue] = initializePrReviewAndCommentsQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index github copilot data
   */
  const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue] = initializeCopilotQueue(stack);

  /**
   * Queue to format and index branch counter data
   */
  const [branchCounterFormatterQueue, branchCounterIndexQueue,] = initializeBranchCounterQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index migrate data
   */
  const [collectCommitsData, collecthistoricalPrByumber, collectPRData, collectPRReviewCommentsData, collectReviewsData, historicalBranch, collectPRCommitsData] =
    initializeMigrationQueue(stack, { githubMappingTable, retryProcessTable },
      [prFormatDataQueue, commitFormatDataQueue, prReviewCommentFormatDataQueue, commitFormatDataQueue]);

  /**
   * Initialize Functions
   */
  const [ghCopilotFunction, ghBranchCounterFunction, processRetryFunction] = initializeFunctions(stack,
    [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue, branchCounterFormatterQueue,
      userIndexDataQueue, userFormatDataQueue, repoIndexDataQueue, repoFormatDataQueue,
      branchIndexDataQueue, branchFormatDataQueue, prIndexDataQueue, prFormatDataQueue,
      commitIndexDataQueue, commitFormatDataQueue, pushIndexDataQueue, pushFormatDataQueue,
      prReviewCommentIndexDataQueue, prReviewCommentFormatDataQueue, afterRepoSaveQueue,
      prReviewIndexDataQueue, prReviewFormatDataQueue, collectPRData, collectReviewsData,
      collecthistoricalPrByumber, collectCommitsData, historicalBranch,
      collectPRCommitsData, collectPRReviewCommentsData,
      branchCounterIndexQueue, ghMergedCommitProcessQueue], { githubMappingTable, retryProcessTable });

  initializeCron(
    stack,
    stack.stage,
    processRetryFunction,
    ghCopilotFunction,
    ghBranchCounterFunction
  );

  const ghAPI = new Api(stack, 'api', {
    authorizers: {
      universal: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'Universal-Authorizer', {
          handler: 'packages/auth/src/auth.handler',
          bind: [AUTH_PUBLIC_KEY],
        }),
      },
      admin: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'Admin-Authorizer', {
          handler: 'packages/auth/src/admin-auth.handler',
          bind: [AUTH_PUBLIC_KEY],
        }),
      },
    },
    defaults: {
      authorizer: 'universal',
      function: {
        timeout: '30 seconds',
        bind: [
          userFormatDataQueue,
          commitFormatDataQueue,
          repoFormatDataQueue,
          branchFormatDataQueue,
          prFormatDataQueue,
          prReviewCommentFormatDataQueue,
          pushFormatDataQueue,
          prReviewFormatDataQueue,
          branchCounterFormatterQueue,
          GITHUB_BASE_URL,
          GITHUB_APP_ID,
          GITHUB_APP_PRIVATE_KEY_PEM,
          GITHUB_SG_INSTALLATION_ID,
          GITHUB_WEBHOOK_SECRET,
          GITHUB_SG_ACCESS_TOKEN,
          OPENSEARCH_NODE,
          OPENSEARCH_PASSWORD,
          OPENSEARCH_USERNAME,
          GIT_ORGANIZATION_ID,
          githubMappingTable,
          retryProcessTable,
          afterRepoSaveQueue,
          collectPRData,
          collectReviewsData,
          collectReviewsData,
          collecthistoricalPrByumber,
          collectCommitsData,
          collectPRCommitsData,
          collectPRReviewCommentsData,
          historicalBranch,
          commitFileChanges,
        ],
      },
    },
    routes: {
      // GET Metadata route
      'GET /github/metadata': {
        function: {
          handler: 'packages/github/src/service/get-metadata.handler',
          timeout: '15 minutes',
        },
        authorizer: 'admin',
      },
      // GET github installation access token
      'GET /github/installation-access-token': {
        function: 'packages/github/src/service/installation-access-token.handler',
        authorizer: 'admin',
      },
      // GET github Oauth token
      'GET /github/auth-token': {
        function: 'packages/github/src/service/jwt-token.getOauthToken',
        authorizer: 'admin',
      },
      // GET Github app installations
      'GET /github/app/installations': {
        function: 'packages/github/src/service/github-app-installation-list.handler',
        authorizer: 'admin',
      },
      // POST Webhook handler
      'POST /github/webhook': {
        function: 'packages/github/src/service/webhook.webhookData',
        authorizer: 'none',
      },
      // GET GithubUser data
      'GET /github/user/{githubUserId}': {
        function: 'packages/github/src/service/get-user.handler',
        authorizer: 'universal',
      },
      // GET GithubRepo data
      'GET /github/repositories': {
        function: 'packages/github/src/service/get-repo.handler',
        authorizer: 'universal',
      },
      // GET PR comments graph data
      'GET /github/graph/number-comments-added-to-prs': {
        function: 'packages/github/src/service/get-pr-comment.handler',
        authorizer: 'universal',
      },
      // GET Graph for frequency of code commits
      'GET /github/graph/code-commit-frequency': {
        function: 'packages/github/src/service/get-commit-frequency.handler',
        authorizer: 'universal',
      },
      // GET Graph for number of PRs
      'GET /github/graph/number-pr-raised': {
        function: 'packages/github/src/service/pr-raised-count.handler',
        authorizer: 'universal',
      },

      // GET Graph for PRs review time
      'GET /github/graph/pr-wait-time': {
        function: 'packages/github/src/service/pr-wait-time.handler',
        authorizer: 'universal',
      },

      // GET Historical Data
      'GET /github/history': {
        function: 'packages/github/src/service/history-data.handler',
      },

      // GET github data ingestion failed retry
      'GET /github/retry/failed': {
        function: 'packages/github/src/cron/retry-process.handler',
      },

      // GET create all ES indices
      'GET /github/create-indices': {
        function: 'packages/github/src/service/create-indices.handler',
      },

      // GET github active number of branches
      'GET /github/graph/number-of-branches': {
        function: 'packages/github/src/service/active-branches.handler',
        authorizer: 'universal',
      },

      'GET /github/graph/number-of-branches-by-repo': {
        function: 'packages/github/src/cron/branch-counter.handler',
      },

      // GET Graph for avg lines of code per day per developer
      'GET /github/graph/lines-of-code': {
        function: 'packages/github/src/service/get-lines-of-code.handler',
        authorizer: 'universal',
      },
      'GET /github/file-changes-of-commit': {
        function: 'packages/github/src/service/file-changes-of-commit.handler',
        authorizer: 'universal',
      },
    },
  });

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
