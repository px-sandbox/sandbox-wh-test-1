import CryptoJS from 'crypto-js';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { Config } from 'sst/node/config';
import { Github, Other } from 'abstraction';
import { saveUserDetails } from 'src/lib/save-user-details';
import { logger } from 'core';
import { saveRepoDetails } from 'src/lib/save-repo-details';
import { saveBranchDetails } from 'src/lib/save-branch-details';

export const WebhookData = async function getWebhookData(
	event: APIGatewayProxyEvent
): Promise<void | Other.Type.LambdaResponse> {
	logger.info('method invoked');
	const payload = event.body || '{}';

	/**
   * ------------------------------------
   * GITHUB WEBHOOK AUTHENTICATION
   * ------------------------------------
   * Generate token to compare with x-hub-signature-256
   * so that we can allow only github webhook requests
   *
   */

	const signature = CryptoJS.HmacSHA256(
		CryptoJS.enc.Utf8.parse(payload),
		Config.GITHUB_WEBHOOK_SECRET
	);

	const sigHex = `sha256=${CryptoJS.enc.Hex.stringify(signature)}`;

	console.log('SIG - HMAC (CryptoJS): ', sigHex);
	logger.info(event.headers);
	console.log('REQUEST CONTEXT---------', event.requestContext);
	const reqContext = event.requestContext as typeof event.requestContext & {
    timeEpoch: number;
  };
	const eventTime = reqContext.timeEpoch;
	console.log('time epoch -------', new Date(eventTime));
	if (
		event.headers['x-hub-signature-256']?.length !== sigHex.length ||
    !sigHex.match(event.headers['x-hub-signature-256'])
	) {
		logger.error('Webhook request not validated');
		return {
			statusCode: 403,
			body: 'Permission Denied',
		};
	} else {
		const data = JSON.parse(event.body || '{}');
		console.log('check sign1', sigHex.match(event.headers['x-hub-signature-256']));

		let eventType = event.headers['x-github-event']?.toLowerCase();
		const branchEvents = ['create', 'delete'];

		if (eventType) {
			if (branchEvents.includes(eventType) && data.ref_type?.toLowerCase() === 'branch') {
				eventType = 'branch';
			}
		} else {
			logger.error('Webhook event can not be empty');
			return {
				statusCode: 400,
				body: 'Bad Request : Event type can not be undefined',
			};
		}

		let obj = {};
		switch (eventType?.toLowerCase()) {
		case Github.Enums.Event.Repo:
			await saveRepoDetails(data.repository as Github.ExternalType.Webhook.Repository);
			break;
		case Github.Enums.Event.Branch:
			const {
				ref: name,
				repository: { id: repo_id, pushed_at: event_at },
			} = data as Github.ExternalType.Webhook.Branch;

			if (event.headers['x-github-event'] === 'create') {
				obj = {
					name,
					id: Buffer.from(`${repo_id}_${name}`, 'binary').toString('base64'),
					action: Github.Enums.Branch.Created,
					repo_id,
					created_at: event_at,
				};
			}
			if (event.headers['x-github-event'] === 'delete') {
				obj = {
					id: Buffer.from(`${repo_id}_${name}`, 'binary').toString('base64'),
					action: Github.Enums.Branch.Deleted,
					deleted_at: event_at,
				};
			}
			logger.info('-------Branch event --------');
			logger.info(obj);
			await saveBranchDetails(obj as Github.ExternalType.Api.Branch);
			break;

		case Github.Enums.Event.Organization:
			if (!data?.membership) {
				break;
			}
			const {
				membership: {
					user: { id: id, login: login, avatar_url: avatar_url },
				},
			} = data as Github.ExternalType.Webhook.User;

			switch (data.action?.toLowerCase()) {
			case Github.Enums.Organization.MemberAdded:
				obj = {
					id,
					action: Github.Enums.Organization.MemberAdded,
					login,
					avatar_url,
					created_at: new Date(eventTime),
				};
				break;
			case Github.Enums.Organization.MemberRemoved:
				obj = {
					id,
					action: Github.Enums.Organization.MemberRemoved,
					deleted_at: new Date(eventTime),
				};
				break;
			}
			logger.info('-------User event --------');
			logger.info(obj);
			await saveUserDetails(obj as Github.ExternalType.Api.User);
			break;
		default:
			break;
		}
	}
};
