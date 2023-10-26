import { Duration, Stack } from 'aws-cdk-lib';
import { Api, Cron, Function, Queue, StackContext, Table, use } from 'sst/constructs';
import { commonConfig } from './common/config';
import { initailizeBranchQueue } from './github/queue/branch';
import { initializeUserQueue } from './github/queue/user';
import { Stage } from './type/stack-config';
import { initailizeCommitQueue } from './github/queue/commit';
import { initailizePrQueue } from './github/queue/pr';
import { initailizePushQueue } from './github/queue/push';
import { initaializePrReviewAndCommentsQueue } from './github/queue/review';
import { initailizeCopilotQueue } from './github/queue/copilot';
import { initalizeBranchCounterQueue } from './github/queue/branch-counter';
import { initializeRepoQueue } from './github/queue/repo';

function initializeDynamoDBTables(stack: Stack): Record<string, Table> {
  const tables = {} as Record<string, Table>;
  tables.githubMappingTable = new Table(stack, 'GithubMapping', {
    fields: {
      parentId: 'string',
      githubId: 'string',
    },
    globalIndexes: {
      githubIndex: { partitionKey: 'githubId' },
    },
    primaryIndex: { partitionKey: 'parentId' },
  });
  tables.retryProcessTable = new Table(stack, 'process-retry', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });
  return tables;
}

function intializeCron(
  stack: Stack,
  stage: string,
  // eslint-disable-next-line @typescript-eslint/ban-types
  processRetryFunction: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  ghCopilotFunction: Function,
  // eslint-disable-next-line @typescript-eslint/ban-types
  ghBranchCounterFunction: Function
): void {
  // Initialized cron job for every 1 hour to fetch failed processes from `retryProcessTable` Table and process them out
  // Cron Expression : cron(Minutes Hours Day-of-month Month Day-of-week Year)
  // eslint-disable-next-line no-new
  new Cron(stack, 'failed-process-retry-cron', {
    schedule: 'cron(0/30 * ? * * *)',
    job: processRetryFunction,
  });

  if (stage === Stage.LIVE) {
    // eslint-disable-next-line no-new
    new Cron(stack, 'github-copilot-cron', {
      schedule: 'cron(0 * ? * * *)',
      job: ghCopilotFunction,
    });
  }

  // initialize a cron that runs every night at 23:30 UTC
  // eslint-disable-next-line no-new
  new Cron(stack, 'branch-counter-cron', {
    // schedule: 'cron(30 23 ? * * *)',
    // run every 5 minutes for testing
    schedule: 'cron(0/5 * ? * * *)',
    job: ghBranchCounterFunction,
  });
}

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

  // Initialize DynamoDB Tables
  const { githubMappingTable, retryProcessTable } = initializeDynamoDBTables(stack);

  // create queues
  /** 
   * Queue to format and index user data
   */
  const [userFormatDataQueue, userIndexDataQueue] = initializeUserQueue(stack, { githubMappingTable, retryProcessTable });

  /**
   * Queue to format and index repo data
   */
  const [repoFormatDataQueue, repoIndexDataQueue, afterRepoSaveQueue] = initializeRepoQueue(stack);

  /**
   * Queue to format and index branch data
   */

  const [branchFormatDataQueue, branchIndexDataQueue] = initailizeBranchQueue(stack);

  /**
   * Queue to format and index commit data
   */
  const [commitFormatDataQueue, commitIndexDataQueue, ghMergedCommitProcessQueue] = initailizeCommitQueue(stack);

  /**
   * Queue to format and index PR data
   */
  const [prFormatDataQueue, prIndexDataQueue] = initailizePrQueue(stack, ghMergedCommitProcessQueue);

  /**
   * Queue to format and index push data
   */
  const [pushFormatDataQueue, pushIndexDataQueue] = initailizePushQueue(stack);

  /**
   * Queue to format and index PR review and comment data
   */
  const [prReviewIndexDataQueue, prReviewFormatDataQueue, prReviewCommentFormatDataQueue, prReviewCommentIndexDataQueue] = initaializePrReviewAndCommentsQueue(stack);

  /**
   * Queue to format and index github copilot data
   */
  const [ghCopilotFormatDataQueue, ghCopilotIndexDataQueue] = initailizeCopilotQueue(stack);

  /**
   * Queue to format and index branch counter data
   */
  const [branchCounterIndexQueue, branchCounterFormatterQueue] = initalizeBranchCounterQueue(stack, { githubMappingTable, retryProcessTable });

  const collectPRData = new Queue(stack, 'gh_historical_pr', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });

  collectPRData.addConsumer(stack, {
    function: new Function(stack, 'histPRFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [collectPRData],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectReviewsData = new Queue(stack, 'gh_historical_reviews', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });

  collectReviewsData.addConsumer(stack, {
    function: new Function(stack, 'histPrReviewFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-review.handler',
      timeout: '30 seconds',
      runtime: 'nodejs18.x',
      bind: [collectReviewsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const collecthistoricalPrByumber = new Queue(stack, 'gh_historical_pr_by_number', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });
  collecthistoricalPrByumber.addConsumer(stack, {
    function: new Function(stack, 'histPrByNumberFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-by-number.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [collecthistoricalPrByumber],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectCommitsData = new Queue(stack, 'gh_historical_commits', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });
  collectCommitsData.addConsumer(stack, {
    function: new Function(stack, 'histCommitFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-commit.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [collectCommitsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 2,
      },
    },
  });

  const historicalBranch = new Queue(stack, 'gh_historical_branch', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });

  historicalBranch.addConsumer(stack, {
    function: new Function(stack, 'histBranchFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-branch.handler',
      bind: [historicalBranch],
      runtime: 'nodejs18.x',
      timeout: '300 seconds',
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 2,
      },
    },
  });

  const collectPRCommitsData = new Queue(stack, 'gh_historical_pr_commits', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });
  collectPRCommitsData.addConsumer(stack, {
    function: new Function(stack, 'histPRCommitFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-commit.handler',
      timeout: '30 seconds',
      runtime: 'nodejs18.x',
      bind: [collectPRCommitsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const collectPRReviewCommentsData = new Queue(stack, 'gh_historical_pr_comments', {
    cdk: {
      queue: {
        visibilityTimeout: Duration.seconds(600),
      },
    },
  });
  collectPRReviewCommentsData.addConsumer(stack, {
    function: new Function(stack, 'histPRReviewCommentsFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-comment.handler',
      timeout: '300 seconds',
      runtime: 'nodejs18.x',
      bind: [collectPRReviewCommentsData],
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

  // bind tables and config to queue


  repoFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    repoIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
  branchFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    branchIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
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
  pushFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    pushIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
  prReviewCommentFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    prReviewCommentIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);

  pushIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  commitIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  repoIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    afterRepoSaveQueue,
  ]);
  branchIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  prIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  prReviewCommentIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  prReviewFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    prReviewIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
  prReviewIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);

  afterRepoSaveQueue.bind([
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    branchFormatDataQueue,
    branchIndexDataQueue,
  ]);

  ghCopilotFormatDataQueue.bind([ghCopilotIndexDataQueue, GIT_ORGANIZATION_ID]);
  ghCopilotIndexDataQueue.bind([OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  collectPRData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    collectReviewsData,
    GIT_ORGANIZATION_ID,
    collectPRCommitsData,
    collectPRReviewCommentsData,
  ]);
  collecthistoricalPrByumber.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    prFormatDataQueue,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
  ]);
  collectReviewsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collecthistoricalPrByumber,
    prReviewFormatDataQueue,
  ]);

  collectCommitsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
    collectPRData,
  ]);

  collectPRCommitsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
  ]);

  collectPRReviewCommentsData.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    prReviewCommentFormatDataQueue,
  ]);

  historicalBranch.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collectCommitsData,
  ]);

  const processRetryFunction = new Function(stack, 'retry-failed-processor', {
    handler: 'packages/github/src/cron/retry-process.handler',
    bind: [
      retryProcessTable,
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

  // Initialize cron
  intializeCron(
    stack,
    stack.stage,
    processRetryFunction,
    ghCopilotFunction,
    ghBranchCounterFunction
  );

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
