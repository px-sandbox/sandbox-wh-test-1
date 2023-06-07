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
    consumer: 'packages/github/src/sqs/handlers/indexer/users.handler',
  });
  const userFormatDataQueue = new Queue(stack, 'gh_users_format', {
    consumer: 'packages/github/src/sqs/handlers/formatter/users.handler',
  });

  const repoIndexDataQueue = new Queue(stack, 'gh_repo_index', {
    consumer: 'packages/github/src/sqs/handlers/indexer/repo.handler',
  });
  const repoFormatDataQueue = new Queue(stack, 'gh_repo_format', {
    consumer: 'packages/github/src/sqs/handlers/formatter/repo.handler',
  });
  const branchFormatDataQueue = new Queue(stack, 'gh_branch_format', {
    consumer: 'packages/github/src/sqs/handlers/formatter/branch.handler',
  });
  const branchIndexDataQueue = new Queue(stack, 'gh_branch_index', {
    consumer: 'packages/github/src/sqs/handlers/indexer/branch.handler',
  });

  const commitFormatDataQueue = new Queue(stack, 'gh_commit_format', {
    consumer: 'packages/github/src/sqs/handlers/formatter/commit.handler',
  });
  const commitIndexDataQueue = new Queue(stack, 'gh_commit_index', {
    consumer: 'packages/github/src/sqs/handlers/indexer/commit.handler',
  });

  // bind tables and config to queue
  userFormatDataQueue.bind([table, userIndexDataQueue, GIT_ORGANIZATION_ID]);
  repoFormatDataQueue.bind([table, repoIndexDataQueue, GIT_ORGANIZATION_ID]);
  branchFormatDataQueue.bind([table, branchIndexDataQueue, GIT_ORGANIZATION_ID]);
  commitFormatDataQueue.bind([table, commitIndexDataQueue, GIT_ORGANIZATION_ID]);
  userIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  repoIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  branchIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);
  commitIndexDataQueue.bind([table, OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME]);


  const ghAPI = new Api(stack, 'api', {
    authorizers: {
      lambdas: {
        type: 'lambda',
        responseTypes: ['simple'],
        function: new Function(stack, 'Authorizer', {
          handler: 'packages/auth/src/auth.handler',
          bind: [AUTH_PUBLIC_KEY],
        }),
      },
    },
    defaults: {
      authorizer: 'lambdas',
      function: {
        bind: [
          userFormatDataQueue,
          repoFormatDataQueue,
          branchFormatDataQueue,
          userIndexDataQueue,
          repoIndexDataQueue,
          branchIndexDataQueue,
          commitFormatDataQueue,
          commitIndexDataQueue,
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
        ],
      },
    },
    routes: {
      // GET Metadata route
      'GET /github/metadata': 'packages/github/src/service/get-metadata.handler',
      // GET github installation access token
      'GET /github/installation-access-token':
        'packages/github/src/service/installation-access-token.handler',
      // GET github Oauth token
      'GET /github/auth-token': 'packages/github/src/service/jwt-token.getOauthToken',
      // GET Github app installations
      'GET /github/app/installations':
        'packages/github/src/service/github-app-installations.handler',
      // POST Webhook handler
      'POST /github/webhook': {
        function: 'packages/github/src/service/webhook.webhookData',
        authorizer: 'none',
      },
      // GET GithubUser data
      'GET /github/user/{githubUserId}': 'packages/github/src/service/git-users.handler',
    },
  });

  stack.addOutputs({
    ApiEndpoint: ghAPI.url,
  });

  return {
    ghAPI,
  };
}
