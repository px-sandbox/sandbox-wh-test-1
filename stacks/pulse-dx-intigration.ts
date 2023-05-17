import { StackContext, Api, Table, Queue, Config } from 'sst/constructs';

export function PulseDXIntegration({ stack }: StackContext) {
	// Set GITHUB config params
	const GITHUB_APP_ID = new Config.Secret(stack, 'GITHUB_APP_ID');
	const GITHUB_APP_PRIVATE_KEY_PEM = new Config.Secret(stack, 'GITHUB_APP_PRIVATE_KEY_PEM');
	const GITHUB_BASE_URL = new Config.Secret(stack, 'GITHUB_BASE_URL');
	const GITHUB_SG_INSTALLATION_ID = new Config.Secret(stack, 'GITHUB_SG_INSTALLATION_ID');
	const GITHUB_WEBHOOK_SECRET = new Config.Secret(stack, 'GITHUB_WEBHOOK_SECRET');
	//const GITHUB_SG_ACCESS_TOKEN = new Config.Secret(stack, 'GITHUB_SG_ACCESS_TOKEN');

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

	// Create Queue
	const queue = new Queue(stack, 'Queue', {
		consumer: 'packages/core/src/lib/aws/sqs-data-receiver.handler',
	});

	queue.bind([table]);

	const api = new Api(stack, 'api', {
		defaults: {
			function: {
				bind: [
					queue,
					GITHUB_BASE_URL,
					GITHUB_APP_ID,
					GITHUB_APP_PRIVATE_KEY_PEM,
					GITHUB_SG_INSTALLATION_ID,
					GITHUB_WEBHOOK_SECRET,
					table,
					// GITHUB_SG_ACCESS_TOKEN,
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
		},
	});

	stack.addOutputs({
		ApiEndpoint: api.url,
	});
}
