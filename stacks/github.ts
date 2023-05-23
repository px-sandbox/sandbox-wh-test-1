import { StackContext, Api, Table, Config, Queue } from 'sst/constructs';

export function gh({ stack }: StackContext) {
  // Set GITHUB config params
  const GITHUB_APP_ID = new Config.Secret(stack, 'GITHUB_APP_ID');
  const GITHUB_APP_PRIVATE_KEY_PEM = new Config.Secret(stack, 'GITHUB_APP_PRIVATE_KEY_PEM');
  const GITHUB_BASE_URL = new Config.Secret(stack, 'GITHUB_BASE_URL');
  const GITHUB_SG_INSTALLATION_ID = new Config.Secret(stack, 'GITHUB_SG_INSTALLATION_ID');
  const GITHUB_WEBHOOK_SECRET = new Config.Secret(stack, 'GITHUB_WEBHOOK_SECRET');
  const GITHUB_SG_ACCESS_TOKEN = new Config.Secret(stack, 'GITHUB_SG_ACCESS_TOKEN');
  const STAGE = new Config.Secret(stack, 'STAGE');

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
  const userQueue = new Queue(stack, 'gh_users', {
    consumer: 'packages/github/src/sqs/handlers/user.handler',
  });

  const repoQueue = new Queue(stack, 'gh_repo', {
    consumer: 'packages/github/src/sqs/handlers/repo.handler',
  });

  const branchQueue = new Queue(stack, 'gh_branch', {
    consumer: 'packages/github/src/sqs/handlers/branch.handler',
  });

  // bind tables to queue
  userQueue.bind([table]);
  repoQueue.bind([table]);
  branchQueue.bind([table]);

  const ghAPI = new Api(stack, 'api', {
    defaults: {
      function: {
        bind: [
          userQueue,
          repoQueue,
          branchQueue,
          GITHUB_BASE_URL,
          GITHUB_APP_ID,
          GITHUB_APP_PRIVATE_KEY_PEM,
          GITHUB_SG_INSTALLATION_ID,
          GITHUB_WEBHOOK_SECRET,
          table,
          GITHUB_SG_ACCESS_TOKEN,
          STAGE,
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
      // POST AWS SQS
      'POST /aws/sqs/trigger': 'packages/core/src/lib/aws/sqs-data-sender.handler',
      // GET Github app installations
      'GET /github/app/installations':
        'packages/github/src/service/github-app-installations.handler',
      // POST Webhook handler
      'POST /github/webhook': 'packages/github/src/service/webhook.webhookData',
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
