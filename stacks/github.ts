import { StackContext, Api, Table, Config, Queue, Function } from 'sst/constructs';

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

  // create queues
  const userIndexDataQueue = new Queue(stack, 'gh_users_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/users.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const userFormatDataQueue = new Queue(stack, 'gh_users_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/users.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const repoIndexDataQueue = new Queue(stack, 'gh_repo_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/repo.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const repoFormatDataQueue = new Queue(stack, 'gh_repo_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/repo.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const branchFormatDataQueue = new Queue(stack, 'gh_branch_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/branch.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const branchIndexDataQueue = new Queue(stack, 'gh_branch_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/branch.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const pRFormatDataQueue = new Queue(stack, 'gh_pr_format', {
    consumer: {
      function: {
        handler: 'packages/github/src/sqs/handlers/formatter/pull-request.handler',
        timeout: '15 minutes',
      },
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const pRIndexDataQueue = new Queue(stack, 'gh_pr_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/pull-request.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const commitFormatDataQueue = new Queue(stack, 'gh_commit_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/commit.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const commitIndexDataQueue = new Queue(stack, 'gh_commit_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/commit.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const pushFormatDataQueue = new Queue(stack, 'gh_push_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/push.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const pushIndexDataQueue = new Queue(stack, 'gh_push_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/push.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const pRReviewCommentFormatDataQueue = new Queue(stack, 'gh_pr_review_comment_format', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/formatter/pull-request-review-comment.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const pRReviewCommentIndexDataQueue = new Queue(stack, 'gh_pr_review_comment_index', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/indexer/pull-request-review-comment.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const afterRepoSaveQueue = new Queue(stack, 'gh_after_repo_save', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/save-branches.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });
  const pRReviewFormatDataQueue = new Queue(stack, 'gh_pr_review_format', {
    consumer: 'packages/github/src/sqs/handlers/formatter/pull-request-review.handler',
  });
  const pRReviewIndexDataQueue = new Queue(stack, 'gh_pr_review_index', {
    consumer: 'packages/github/src/sqs/handlers/indexer/pull-request-review.handler',
  });

  const collectPRData = new Queue(stack, 'gh_historical_pr', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-pr.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const collectReviewsData = new Queue(stack, 'gh_historical_reviews', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-reviews.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const collectPrNumberData = new Queue(stack, 'gh_historical_single_number', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-pr-number.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const collectCommitsData = new Queue(stack, 'gh_historical_commits', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-commits.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const collectPRCommitsData = new Queue(stack, 'gh_historical_pr_commits', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-pr-commits.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  const collectPRReviewCommentsData = new Queue(stack, 'gh_historical_pr_comments', {
    consumer: {
      function: 'packages/github/src/sqs/handlers/historical/historical-pr-comments.handler',
      cdk: {
        eventSource: {
          batchSize: 10,
        },
      },
    },
  });

  // bind tables and config to queue
  userFormatDataQueue.bind([table, userIndexDataQueue, GIT_ORGANIZATION_ID]);
  repoFormatDataQueue.bind([table, repoIndexDataQueue, GIT_ORGANIZATION_ID]);
  branchFormatDataQueue.bind([table, branchIndexDataQueue, GIT_ORGANIZATION_ID]);
  commitFormatDataQueue.bind([
    table,
    commitIndexDataQueue,
    GIT_ORGANIZATION_ID,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
  ]);
  pRFormatDataQueue.bind([
    table,
    pRIndexDataQueue,
    GIT_ORGANIZATION_ID,
    OPENSEARCH_NODE,
    OPENSEARCH_USERNAME,
    OPENSEARCH_PASSWORD,
    commitFormatDataQueue,
  ]);
  pushFormatDataQueue.bind([table, pushIndexDataQueue, GIT_ORGANIZATION_ID]);
  pRReviewCommentFormatDataQueue.bind([table, pRReviewCommentIndexDataQueue, GIT_ORGANIZATION_ID]);

  pushIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  commitIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  userIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  repoIndexDataQueue.bind([
    table,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    afterRepoSaveQueue,
  ]);
  branchIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  pRIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  pRReviewCommentIndexDataQueue.bind([
    table,
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
  ]);
  pRReviewFormatDataQueue.bind([table, pRReviewIndexDataQueue, GIT_ORGANIZATION_ID]);
  pRReviewIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);

  afterRepoSaveQueue.bind([
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    branchFormatDataQueue,
    branchIndexDataQueue,
  ]);

  collectPRData.bind([
    table,
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
  collectPrNumberData.bind([
    table,
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
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    collectPrNumberData,
    pRReviewFormatDataQueue,
  ]);

  collectCommitsData.bind([
    table,
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
    OPENSEARCH_NODE,
    OPENSEARCH_PASSWORD,
    OPENSEARCH_USERNAME,
    GITHUB_APP_PRIVATE_KEY_PEM,
    GITHUB_APP_ID,
    GITHUB_SG_INSTALLATION_ID,
    GIT_ORGANIZATION_ID,
    pRReviewCommentFormatDataQueue,
  ]);
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
        bind: [
          userFormatDataQueue,
          repoFormatDataQueue,
          branchFormatDataQueue,
          pRFormatDataQueue,
          userIndexDataQueue,
          repoIndexDataQueue,
          branchIndexDataQueue,
          commitFormatDataQueue,
          commitIndexDataQueue,
          pRIndexDataQueue,
          pRReviewCommentFormatDataQueue,
          pRReviewCommentIndexDataQueue,
          pushFormatDataQueue,
          pushIndexDataQueue,
          pRReviewFormatDataQueue,
          pRReviewIndexDataQueue,
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
          afterRepoSaveQueue,
          collectPRData,
          collectReviewsData,
          collectReviewsData,
          collectPrNumberData,
          collectCommitsData,
          collectPRCommitsData,
          collectPRReviewCommentsData,
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
