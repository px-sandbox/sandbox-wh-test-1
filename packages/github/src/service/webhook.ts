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

const sqsClient = SQSClient.getInstance();
interface ReviewCommentProcessType {
  comment: Github.ExternalType.Webhook.PRReviewComment;
  pull_request: { id: number };
  repository: { id: number; owner: { id: number } };
  action: string;
}
interface ReviewProcessType {
  review: Github.ExternalType.Webhook.PRReview;
  pull_request: { id: number; number: number };
  repository: { id: number; name: string; owner: { login: string; id: string } };
  action: string;
}
function generateHMACToken(payload: crypto.BinaryLike): Buffer {
  const hmac = Buffer.from(
    'sha256' +
      `=${crypto.createHmac('sha256', Config.GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')}`
  );
  return hmac;
}
function getEventType(
  eventType: string | undefined,
  refType: string,
  requestId: string
): string | null {
  let updatedEventType = eventType;
  const branchEvents = ['create', 'delete'];
  if (updatedEventType) {
    if (branchEvents.includes(updatedEventType) && refType?.toLowerCase() === 'branch') {
      updatedEventType = 'branch';
    }
    return updatedEventType;
  }
  logger.error({ message: 'getEventType.error: Webhook event can not be empty', requestId });
  return null;
}
async function processRepoEvent(
  data: Github.ExternalType.Webhook.Repository,
  action: string,
  requestId: string
): Promise<void> {
  await sqsClient.sendMessage({ ...data, action }, Queue.qGhRepoFormat.queueUrl, {
    requestId,
    resourceId: data.name,
  });
}
async function processBranchEvent(
  data: Github.ExternalType.Webhook.Branch,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<void> {
  const {
    ref: name,
    repository: {
      id: repoId,
      pushed_at: eventAt,
      owner: { id: orgId },
    },
  } = data;
  let obj = {};
  let resourceId = '';
  if (event.headers['x-github-event'] === 'create') {
    obj = {
      name,
      id: Buffer.from(`${repoId}_${name}`, 'binary').toString('base64'),
      action: Github.Enums.Branch.Created,
      repo_id: repoId,
      created_at: eventAt,
      orgId,
    };
    resourceId = name;
  }
  if (event.headers['x-github-event'] === 'delete') {
    obj = {
      name,
      id: Buffer.from(`${repoId}_${name}`, 'binary').toString('base64'),
      action: Github.Enums.Branch.Deleted,
      repo_id: repoId,
      deleted_at: eventAt,
      orgId,
    };
    resourceId = name;
  }
  logger.info({ message: '------- Branch event--------', data: obj, requestId, resourceId });
  await sqsClient.sendMessage(obj, Queue.qGhBranchFormat.queueUrl, { requestId, resourceId });
}
async function processOrgEvent(
  data: Github.ExternalType.Webhook.User,
  eventTime: number,
  requestId: string
): Promise<void | boolean> {
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
      logger.info({
        message: `processOrgEvent.info: No case found for ${data.action} in organization event`,
      });
      break;
  }
  if (Object.keys(obj).length === 0) return false;
  const resourceId = data.membership.user.login;
  logger.info({
    message: 'processOrgEvent.info: -------User event --------',
    data: obj,
    requestId,
    resourceId,
  });
  await sqsClient.sendMessage(obj, Queue.qGhUsersFormat.queueUrl, { requestId, resourceId });
}
async function processCommitEvent(
  data: Github.ExternalType.Webhook.Commit,
  requestId: string
): Promise<void> {
  const commitData = data;
  await getCommits(commitData, requestId);
}
async function processPREvent(
  pr: Github.ExternalType.Webhook.PullRequest,
  action: string,
  requestId: string
): Promise<void> {
  await pROnQueue(pr, action, requestId);
}
async function processPRReviewCommentEvent(
  data: ReviewCommentProcessType,
  requestId: string
): Promise<void> {
  await pRReviewCommentOnQueue(
    data.comment,
    data.pull_request.id,
    data.repository.id,
    data.action,
    data.pull_request as Github.ExternalType.Webhook.PullRequest,
    data.repository.owner.id,
    requestId
  );
}
async function processPRReviewEvent(data: ReviewProcessType, requestId: string): Promise<void> {
  await pRReviewOnQueue(
    data.review,
    data.pull_request.id,
    data.repository.id,
    data.repository.name,
    data.repository.owner.login,
    data.repository.owner.id,
    data.pull_request.number,
    data.action,
    requestId
  );
}
async function processWebhookEvent(
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any,
  eventTime: number,
  event: APIGatewayProxyEvent,
  requestId: string
): Promise<void> {
  switch (eventType?.toLowerCase()) {
    case Github.Enums.Event.Repo:
      await processRepoEvent(data.repository, data.action, requestId);
      break;
    case Github.Enums.Event.Branch:
      await processBranchEvent(data, event, requestId);
      break;
    case Github.Enums.Event.Organization:
      if (!data?.membership) {
        break;
      }
      await processOrgEvent(data, eventTime, requestId);
      break;
    case Github.Enums.Event.Commit:
      await processCommitEvent(data, requestId);
      break;
    case Github.Enums.Event.PullRequest:
      await processPREvent(data.pull_request, data.action, requestId);
      break;
    case Github.Enums.Event.PRReviewComment:
      await processPRReviewCommentEvent(data, requestId);
      break;
    case Github.Enums.Event.PRReview:
      await processPRReviewEvent(data, requestId);
      break;
    default:
      logger.info({
        message: `processWebhookEvent.info: No case found for ${eventType} in webhook event`,
        requestId,
      });
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
  const reqContext = event.requestContext as typeof event.requestContext & {
    timeEpoch: number;
  };
  const eventTime = reqContext.timeEpoch;
  const { requestId } = reqContext;
  logger.info({
    message: 'webhookData.info: time epoch -------',
    data: new Date(eventTime),
    requestId,
  });
  logger.info({ message: 'webhookData.info: method invoked', data: { event }, requestId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = event.body ?? {};
  const data = JSON.parse(event.body ?? '{}');

  if (!data.organization) return;

  const { id: orgId } = data.organization;
  logger.info({
    message: 'webhookData.info: Organization : ',
    data: { login: data.organization.login },
    requestId,
  });
  if (orgId !== Number(Config.GIT_ORGANIZATION_ID)) return;

  const sig = Buffer.from(event.headers['x-hub-signature-256'] ?? '');
  const hmac = generateHMACToken(payload);

  if (sig.length !== hmac.length || !crypto.timingSafeEqual(hmac, sig)) {
    logger.error({ message: 'webhookData.error: Webhook request not validated', requestId });
    return {
      statusCode: 403,
      body: 'Permission Denied',
    };
  }
  const eventType = getEventType(
    event.headers['x-github-event']?.toLowerCase(),
    data.ref_type,
    requestId
  );
  if (!eventType) {
    return {
      statusCode: 400,
      body: 'Bad Request : Event type can not be undefined',
    };
  }

  logger.info({
    message: 'webhookData.info: REQUEST CONTEXT---------',
    data: event.requestContext,
    requestId,
  });

  await processWebhookEvent(eventType, data, eventTime, event, requestId);
};
