/* eslint-disable camelcase */
import crypto from 'crypto';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { getCommits } from '../lib/git-commit-list';
import { pRReviewCommentOnQueue } from '../lib/pr-review-comment-queue';
import { pRReviewOnQueue } from '../lib/pr-review-queue';
import { pROnQueue } from '../lib/pull-request-queue';

interface ReviewCommentProcessType {
  comment: Github.ExternalType.Webhook.PRReviewComment;
  pull_request: { id: number };
  repository: { id: number };
  action: string;
}
interface ReviewProcessType {
  review: Github.ExternalType.Webhook.PRReview;
  pull_request: { id: number; number: number };
  repository: { id: number; name: string; owner: { login: string } };
  action: string;
}
function generateHMACToken(payload: any): Buffer {
  const hmac = Buffer.from(
    'sha256' +
      `=${crypto.createHmac('sha256', Config.GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')}`
  );
  return hmac;
}
function getEventType(eventType: string | undefined, refType: string): string | null {
  let updatedEventType = eventType;
  const branchEvents = ['create', 'delete'];
  if (updatedEventType) {
    if (branchEvents.includes(updatedEventType) && refType?.toLowerCase() === 'branch') {
      updatedEventType = 'branch';
    }
    return updatedEventType;
  }
  logger.error('Webhook event can not be empty');
  return null;
}
async function processRepoEvent(
  data: Github.ExternalType.Webhook.Repository,
  action: string
): Promise<void> {
  await new SQSClient().sendMessage({ ...data, action }, Queue.gh_repo_format.queueUrl);
}
async function processBranchEvent(
  data: Github.ExternalType.Webhook.Branch,
  event: APIGatewayProxyEvent
): Promise<void> {
  const {
    ref: name,
    repository: { id: repo_id, pushed_at: event_at },
  } = data;
  let obj = {};

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
      name,
      id: Buffer.from(`${repo_id}_${name}`, 'binary').toString('base64'),
      action: Github.Enums.Branch.Deleted,
      repo_id,
      deleted_at: event_at,
    };
  }
  logger.info('-------Branch event --------');
  logger.info(obj);
  await new SQSClient().sendMessage(obj, Queue.gh_branch_format.queueUrl);
}
async function processOrgEvent(
  data: Github.ExternalType.Webhook.User,
  eventTime: number
): Promise<void> {
  let obj = {};
  switch (data.action?.toLowerCase()) {
    case Github.Enums.Organization.MemberAdded:
      obj = {
        ...data.membership.user,
        action: data.action,
      };
      break;
    case Github.Enums.Organization.MemberRemoved:
      obj = {
        ...data.membership.user,
        action: data.action,
        deleted_at: new Date(eventTime),
      };
      break;
    default:
      // handle default case here
      break;
  }
  logger.info('-------User event --------');
  logger.info(obj);
  await new SQSClient().sendMessage(obj, Queue.gh_users_format.queueUrl);
}
async function processCommitEvent(data: Github.ExternalType.Webhook.Commit): Promise<void> {
  const commitData = data;
  await getCommits(commitData);
}
async function processPREvent(
  pr: Github.ExternalType.Webhook.PullRequest,
  action: string
): Promise<void> {
  await pROnQueue(pr, action);
}
async function processPRReviewCommentEvent(data: ReviewCommentProcessType): Promise<void> {
  await pRReviewCommentOnQueue(data.comment, data.pull_request.id, data.repository.id, data.action);
}
async function processPRReviewEvent(data: ReviewProcessType): Promise<void> {
  await pRReviewOnQueue(
    data.review,
    data.pull_request.id,
    data.repository.id,
    data.repository.name,
    data.repository.owner.login,
    data.pull_request.number,
    data.action
  );
}
async function processWebhookEvent(
  eventType: string,
  data: any,
  eventTime: number,
  event: APIGatewayProxyEvent
): Promise<void> {
  switch (eventType?.toLowerCase()) {
    case Github.Enums.Event.Repo:
      await processRepoEvent(data.repository, data.action);
      break;
    case Github.Enums.Event.Branch:
      await processBranchEvent(data, event);
      break;
    case Github.Enums.Event.Organization:
      if (!data?.membership) {
        break;
      }
      await processOrgEvent(data, eventTime);
      break;
    case Github.Enums.Event.Commit:
      await processCommitEvent(data);
      break;
    case Github.Enums.Event.PullRequest:
      await processPREvent(data.pull_request, data.action);
      break;
    case Github.Enums.Event.PRReviewComment:
      await processPRReviewCommentEvent(data);
      break;
    case Github.Enums.Event.PRReview:
      await processPRReviewEvent(data);
      break;
    default:
      break;
  }
}

/**
 * -----------------------------------------------
 * GITHUB WEBHOOK AUTHENTICATION AND REDIRECTIONS
 * -----------------------------------------------
 * Generate token to compare with x-hub-signature-256
 * so that we can allow only github webhook requests.
 * And after that we will process the request based on
 * event type. We will process only those events which
 * are defined in Github.Enums.Event. If event type is
 * not defined then we will return 400 Bad Request. If
 * event type is defined then we will process the request
 * further.
 *
 */
export const webhookData = async function getWebhookData(
  event: APIGatewayProxyEvent
): Promise<void | APIGatewayProxyResult> {
  logger.info('method invoked', { event });
  const payload: any = event.body || {};
  const data = JSON.parse(event.body || '{}');
  if (!data.organization) return;

  const { id: orgId } = data.organization;
  logger.info('Organization : ', { login: data.organization.login });
  if (orgId !== Number(Config.GIT_ORGANIZATION_ID)) return;

  const sig = Buffer.from(event.headers['x-hub-signature-256'] || '');
  const hmac = generateHMACToken(payload);

  logger.info('SIG - HMAC (CryptoJS): ', hmac.toString());
  logger.info(event.headers);

  if (sig.length !== hmac.length || !crypto.timingSafeEqual(hmac, sig)) {
    logger.error('Webhook request not validated');
    return {
      statusCode: 403,
      body: 'Permission Denied',
    };
  }
  const eventType = getEventType(event.headers['x-github-event']?.toLowerCase(), data.ref_type);
  if (!eventType) {
    return {
      statusCode: 400,
      body: 'Bad Request : Event type can not be undefined',
    };
  }

  logger.info('REQUEST CONTEXT---------', event.requestContext);
  const reqContext = event.requestContext as typeof event.requestContext & {
    timeEpoch: number;
  };
  const eventTime = reqContext.timeEpoch;
  logger.info('time epoch -------', new Date(eventTime));

  await processWebhookEvent(eventType, data, eventTime, event);
};
