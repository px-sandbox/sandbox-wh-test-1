import { StackContext, Api, Table, Config, Queue, Function, Cron } from 'sst/constructs';
import { Duration, Stack } from 'aws-cdk-lib';
import { Stage } from './type/stack-config.js';

function initializeSecrets(stack: Stack): Record<string, Config.Secret> {
  const ghSecret = {} as Record<string, Config.Secret>;
  // Set GITHUB config params
  ghSecret.GITHUB_APP_ID = new Config.Secret(stack, 'GITHUB_APP_ID');
  ghSecret.GITHUB_APP_PRIVATE_KEY_PEM = new Config.Secret(stack, 'GITHUB_APP_PRIVATE_KEY_PEM');
  ghSecret.GITHUB_BASE_URL = new Config.Secret(stack, 'GITHUB_BASE_URL');
  ghSecret.GITHUB_SG_INSTALLATION_ID = new Config.Secret(stack, 'GITHUB_SG_INSTALLATION_ID');
  ghSecret.GITHUB_WEBHOOK_SECRET = new Config.Secret(stack, 'GITHUB_WEBHOOK_SECRET');
  ghSecret.GITHUB_SG_ACCESS_TOKEN = new Config.Secret(stack, 'GITHUB_SG_ACCESS_TOKEN');
  ghSecret.AUTH_PUBLIC_KEY = new Config.Secret(stack, 'AUTH_PUBLIC_KEY');
  ghSecret.OPENSEARCH_NODE = new Config.Secret(stack, 'OPENSEARCH_NODE');
  ghSecret.OPENSEARCH_USERNAME = new Config.Secret(stack, 'OPENSEARCH_USERNAME');
  ghSecret.OPENSEARCH_PASSWORD = new Config.Secret(stack, 'OPENSEARCH_PASSWORD');
  ghSecret.GIT_ORGANIZATION_ID = new Config.Secret(stack, 'GIT_ORGANIZATION_ID');
  return ghSecret;
}

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
  stackStage: string,
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

  if (stackStage === Stage.LIVE) {
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
  // Destructure secrets
  const {
    GITHUB_APP_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_BASE_URL,
    GITHUB_SG_INSTALLATION_ID,
    GITHUB_WEBHOOK_SECRET,
    GITHUB_SG_ACCESS_TOKEN,
    AUTH_PUBLIC_KEY,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    GIT_ORGANIZATION_ID,
  } = initializeSecrets(stack);

  // Initialize DynamoDB Tables
  const { githubMappingTable, retryProcessTable } = initializeDynamoDBTables(stack);

  // create queues
  const userIndexDataQueue = new Queue(stack, 'gh_users_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/user.handler',
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
        handler: 'packages/github/src/sqs/handlers/formatter/user.handler',
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

  const pRIndexDataQueue = new Queue(stack, 'gh_pr_index');
  pRIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_index_func', {
      handler: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
      bind: [pRIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const pRFormatDataQueue = new Queue(stack, 'gh_pr_format');
  pRFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_format_func', {
      handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
      timeout: '30 seconds',
      bind: [pRFormatDataQueue, pRIndexDataQueue, ghMergedCommitProcessQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const pushIndexDataQueue = new Queue(stack, 'gh_push_index');
  pushIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_push_index_func', {
      handler: 'packages/github/src/sqs/handlers/indexer/push.handler',
      bind: [pushIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const pushFormatDataQueue = new Queue(stack, 'gh_push_format');
  pushFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_push_format_func', {
      handler: 'packages/github/src/sqs/handlers/formatter/push.handler',
      bind: [pushFormatDataQueue, pushIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const pRReviewCommentIndexDataQueue = new Queue(stack, 'gh_pr_review_comment_index');
  pRReviewCommentIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_review_comment_index_func', {
      handler: 'packages/github/src/sqs/handlers/indexer/pr-review-comment.handler',
      bind: [pRReviewCommentIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });
  const pRReviewCommentFormatDataQueue = new Queue(stack, 'gh_pr_review_comment_format');
  pRReviewCommentFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_review_comment_format_func', {
      handler: 'packages/github/src/sqs/handlers/formatter/pr-review-comment.handler',
      bind: [pRReviewCommentFormatDataQueue, pRReviewCommentIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 1,
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
  const pRReviewIndexDataQueue = new Queue(stack, 'gh_pr_review_index');
  pRReviewIndexDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_review_index_func', {
      handler: 'packages/github/src/sqs/handlers/indexer/pr-review.handler',
      bind: [pRReviewIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const pRReviewFormatDataQueue = new Queue(stack, 'gh_pr_review_format');
  pRReviewFormatDataQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_pr_review_format_func', {
      handler: 'packages/github/src/sqs/handlers/formatter/pr-review.handler',
      bind: [pRReviewFormatDataQueue, pRReviewIndexDataQueue],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const ghCopilotIndexDataQueue = new Queue(stack, 'gh_copilot_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/gh-copilot.handler',
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const ghCopilotFormatDataQueue = new Queue(stack, 'gh_copilot_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/gh-copilot.handler',
        bind: [ghCopilotIndexDataQueue],
      },
      cdk: {
        eventSource: {
          batchSize: 5,
        },
      },
    },
  });

  const branchCounterIndexQueue = new Queue(stack, 'gh_active_branch_counter_index');

  branchCounterIndexQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_active_branch_counter_index_func', {
      handler: 'packages/github/src/sqs/handlers/indexer/active-branch.handler',
      bind: [
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        retryProcessTable,
        githubMappingTable,
        branchCounterIndexQueue,
      ],
    }),
    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

  const branchCounterFormatterQueue = new Queue(stack, 'gh_active_branch_counter_format');

  branchCounterFormatterQueue.addConsumer(stack, {
    function: new Function(stack, 'gh_active_branch_counter_format_func', {
      handler: 'packages/github/src/sqs/handlers/formatter/active-branch.handler',
      bind: [
        OPENSEARCH_NODE,
        OPENSEARCH_PASSWORD,
        OPENSEARCH_USERNAME,
        branchCounterFormatterQueue,
        branchCounterIndexQueue,
        retryProcessTable,
        githubMappingTable,
      ],
    }),

    cdk: {
      eventSource: {
        batchSize: 5,
      },
    },
  });

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

  // bind tables and config to queue

  userFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    userIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
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
  pRFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    pRIndexDataQueue,
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
  pRReviewCommentFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    pRReviewCommentIndexDataQueue,
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
  userIndexDataQueue.bind([
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
  pRIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRReviewCommentIndexDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRReviewFormatDataQueue.bind([
    githubMappingTable,
    retryProcessTable,
    pRReviewIndexDataQueue,
    GIT_ORGANIZATION_ID,
  ]);
  pRReviewIndexDataQueue.bind([
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
    pRFormatDataQueue,
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
    pRReviewFormatDataQueue,
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
    pRReviewCommentFormatDataQueue,
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
          pRFormatDataQueue,
          pRReviewCommentFormatDataQueue,
          pushFormatDataQueue,
          pRReviewFormatDataQueue,
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
