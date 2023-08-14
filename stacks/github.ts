import { StackContext, Api, Table, Config, Queue, Function, Cron } from 'sst/constructs';

export function gh({ stack }: StackContext) {
  // Set GITHUB config params
  const GITHUB_APP_ID = new Config.Secret(stack, 'GITHUB_APP_ID');
  const GITHUB_APP_PRIVATE_KEY_PEM = new Config.Secret(stack, 'GITHUB_APP_PRIVATE_KEY_PEM');
  const GITHUB_BASE_URL = new Config.Secret(stack, 'GITHUB_BASE_URL');
  const GITHUB_SG_INSTALLATION_ID = new Config.Secret(stack, 'GITHUB_SG_INSTALLATION_ID');
  const GITHUB_WEBHOOK_SECRET = new Config.Secret(stack, 'GITHUB_WEBHOOK_SECRET');
  const GITHUB_SG_ACCESS_TOKEN = new Config.Secret(stack, 'GITHUB_SG_ACCESS_TOKEN');
  const AUTH_PUBLIC_KEY = new Config.Secret(stack, 'AUTH_PUBLIC_KEY');
  const OPENSEARCH_NODE = new Config.Secret(stack, 'OPENSEARCH_NODE');
  const OPENSEARCH_USERNAME = new Config.Secret(stack, 'OPENSEARCH_USERNAME');
  const OPENSEARCH_PASSWORD = new Config.Secret(stack, 'OPENSEARCH_PASSWORD');
  const GIT_ORGANIZATION_ID = new Config.Secret(stack, 'GIT_ORGANIZATION_ID');

  // Create Table
  const table = new Table(stack, 'GithubMapping', {
    fields: {
      parentId: 'string',
      githubId: 'string',
    },
    globalIndexes: {
      githubIndex: { partitionKey: 'githubId' },
    },
    primaryIndex: { partitionKey: 'parentId' },
  });

  const retryProcessTable = new Table(stack, 'process-retry', {
    fields: {
      processId: 'string',
    },
    primaryIndex: { partitionKey: 'processId' },
  });

  // create queues
  const userIndexDataQueue = new Queue(stack, 'gh_users_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/users.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const userFormatDataQueue = new Queue(stack, 'gh_users_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/users.handler',
        bind: [userIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

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
  const branchIndexDataQueue = new Queue(stack, 'gh_branch_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/branch.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const branchFormatDataQueue = new Queue(stack, 'gh_branch_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/branch.handler',
        bind: [branchIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const pRIndexDataQueue = new Queue(stack, 'gh_pr_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const pRFormatDataQueue = new Queue(stack, 'gh_pr_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
        timeout: '30 seconds',
        bind: [pRIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const commitIndexDataQueue = new Queue(stack, 'gh_commit_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/commit.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const commitFormatDataQueue = new Queue(stack, 'gh_commit_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/commit.handler',
        // bind: [commitIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
    cdk: {
      queue: {
        fifo: true,
      },
    },
  });

  const pushIndexDataQueue = new Queue(stack, 'gh_push_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/push.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const pushFormatDataQueue = new Queue(stack, 'gh_push_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/push.handler',
        bind: [pushIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });
  const pRReviewCommentIndexDataQueue = new Queue(stack, 'gh_pr_review_comment_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/pull-request-review-comment.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const pRReviewCommentFormatDataQueue = new Queue(stack, 'gh_pr_review_comment_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/pull-request-review-comment.handler',
        bind: [pRReviewCommentIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 1,
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
  const pRReviewIndexDataQueue = new Queue(stack, 'gh_pr_review_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/pull-request-review.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const pRReviewFormatDataQueue = new Queue(stack, 'gh_pr_review_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/pull-request-review.handler',
        bind: [pRReviewIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const collectPRData = new Queue(stack, 'gh_historical_pr');

  collectPRData.addConsumer(stack, {
    function: new Function(stack, 'histPRFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr.handler',
      timeout: '30 seconds',
      runtime: 'nodejs18.x',
      bind: [collectPRData],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectReviewsData = new Queue(stack, 'gh_historical_reviews');

  collectReviewsData.addConsumer(stack, {
    function: new Function(stack, 'histPrReviewFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-reviews.handler',
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

  const collecthistoricalPrByumber = new Queue(stack, 'gh_historical_pr_by_number');
  collecthistoricalPrByumber.addConsumer(stack, {
    function: new Function(stack, 'histPrFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-by-number.handler',
      timeout: '20 seconds',
      runtime: 'nodejs18.x',
      bind: [collecthistoricalPrByumber],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
      },
    },
  });

  const collectCommitsData = new Queue(stack, 'gh_historical_commits');
  collectCommitsData.addConsumer(stack, {
    function: new Function(stack, 'histCommitFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-commits.handler',
      timeout: '30 seconds',
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

  const historicalBranch = new Queue(stack, 'gh_historical_branch');

  historicalBranch.addConsumer(stack, {
    function: new Function(stack, 'histBranchFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-branch.handler',
      bind: [historicalBranch],
      runtime: 'nodejs18.x',
      timeout: '30 seconds',
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
        maxConcurrency: 2,
      },
    },
  });

  const collectPRCommitsData = new Queue(stack, 'gh_historical_pr_commits');
  collectPRCommitsData.addConsumer(stack, {
    function: new Function(stack, 'histPRCommitFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-commits.handler',
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

  const collectPRReviewCommentsData = new Queue(stack, 'gh_historical_pr_comments');
  collectPRReviewCommentsData.addConsumer(stack, {
    function: new Function(stack, 'histPRReviewFunc', {
      handler: 'packages/github/src/sqs/handlers/historical/historical-pr-comments.handler',
      timeout: '30 seconds',
      runtime: 'nodejs18.x',
      bind: [collectPRReviewCommentsData],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  // bind tables and config to queue
  userFormatDataQueue.bind([table, retryProcessTable, userIndexDataQueue, GIT_ORGANIZATION_ID]);
  repoFormatDataQueue.bind([table, retryProcessTable, repoIndexDataQueue, GIT_ORGANIZATION_ID]);
  branchFormatDataQueue.bind([table, retryProcessTable, branchIndexDataQueue, GIT_ORGANIZATION_ID]);
  commitFormatDataQueue.bind([
    table,
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
  pRFormatDataQueue.bind([
    table,
    retryProcessTable,
    pRIndexDataQueue,
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    commitFormatDataQueue,
  ]);
  pushFormatDataQueue.bind([table, retryProcessTable, pushIndexDataQueue, GIT_ORGANIZATION_ID]);
  pRReviewCommentFormatDataQueue.bind([
    table,
    retryProcessTable,
    pRReviewCommentIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);

  pushIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  commitIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  userIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  repoIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    afterRepoSaveQueue,
  ]);
  branchIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRReviewCommentIndexDataQueue.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRReviewFormatDataQueue.bind([
    table,
    retryProcessTable,
    pRReviewIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
  pRReviewIndexDataQueue.bind([
    table,
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

  collectPRData.bind([
    table,
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
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    pRFormatDataQueue,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    commitFormatDataQueue,
  ]);
  collectReviewsData.bind([
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collecthistoricalPrByumber,
    pRReviewFormatDataQueue,
  ]);

  collectCommitsData.bind([
    table,
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
    table,
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
    table,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    pRReviewCommentFormatDataQueue,
  ]);

  historicalBranch.bind([
    table,
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
    handler: 'packages/github/src/cron/retry-processes.handler',
    bind: [
      retryProcessTable,
      userIndexDataQueue,
      userFormatDataQueue,
      repoIndexDataQueue,
      repoFormatDataQueue,
      branchIndexDataQueue,
      branchFormatDataQueue,
      pRIndexDataQueue,
      pRFormatDataQueue,
      commitIndexDataQueue,
      commitFormatDataQueue,
      pushIndexDataQueue,
      pushFormatDataQueue,
      pRReviewCommentIndexDataQueue,
      pRReviewCommentFormatDataQueue,
      afterRepoSaveQueue,
      pRReviewIndexDataQueue,
      pRReviewFormatDataQueue,
      collectPRData,
      collectReviewsData,
      collecthistoricalPrByumber,
      collectCommitsData,
      historicalBranch,
      collectPRCommitsData,
      collectPRReviewCommentsData,
    ],
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
          handler: 'packages/auth/src/adminAuth.handler',
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
          pRFormatDataQueue,
          pRReviewCommentFormatDataQueue,
          pushFormatDataQueue,
          pRReviewFormatDataQueue,
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
          table,
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
        function: 'packages/github/src/service/github-app-installations.handler',
        authorizer: 'admin',
      },
      // POST Webhook handler
      'POST /github/webhook': {
        function: 'packages/github/src/service/webhook.webhookData',
        authorizer: 'none',
      },
      // GET GithubUser data
      'GET /github/user/{githubUserId}': {
        function: 'packages/github/src/service/git-users.handler',
        authorizer: 'universal',
      },
      // GET GithubRepo data
      'GET /github/repositories': {
        function: 'packages/github/src/service/get-repos.handler',
        authorizer: 'universal',
      },
      // GET PR comments graph data
      'GET /github/graph/number-comments-added-to-prs': {
        function: 'packages/github/src/service/get-pr-comments.handler',
        authorizer: 'universal',
      },
      // GET Graph for frequency of code commits
      'GET /github/graph/code-commit-frequency': {
        function: 'packages/github/src/service/get-frequency-code-commit.handler',
        authorizer: 'universal',
      },
      // GET Graph for number of PRs
      'GET /github/graph/number-pr-raised': {
        function: 'packages/github/src/service/number-of-pr-raised.handler',
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

      'GET /github/retry/failed': {
        function: 'packages/github/src/cron/retry-processes.handler',
      },
    },
  });

  // Initialize cron that runs every hour to fetch failed processes from `retryProcessTable` Table and process them out
  new Cron(stack, 'failed-process-retry-cron', {
    schedule: 'cron(*/30 * ? * * *)',
    job: processRetryFunction,
  });

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
