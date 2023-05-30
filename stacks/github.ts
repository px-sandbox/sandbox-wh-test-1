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

  // bind tables and config to queue
  userFormatDataQueue.bind([table, userIndexDataQueue]);
  repoFormatDataQueue.bind([table, repoIndexDataQueue]);
  branchFormatDataQueue.bind([table, branchIndexDataQueue]);

  userIndexDataQueue.bind([table]);
  repoIndexDataQueue.bind([table]);
  branchIndexDataQueue.bind([table]);

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
          GITHUB_BASE_URL,
          GITHUB_APP_ID,
          GITHUB_APP_PRIVATE_KEY_PEM,
          GITHUB_SG_INSTALLATION_ID,
          GITHUB_WEBHOOK_SECRET,
          GITHUB_SG_ACCESS_TOKEN,
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
