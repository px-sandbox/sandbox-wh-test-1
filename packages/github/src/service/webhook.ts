import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { getCommits } from 'src/lib/git-commit-list';
import { pROnQueue } from 'src/lib/send-pull-to-queue';
import { pRReviewCommentOnQueue } from 'src/lib/send-pr-review-comment-to-queue';
import { pRReviewOnQueue } from 'src/lib/send-pr-review-to-queue';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
const crypto = require('crypto');

export const webhookData = async function getWebhookData(
  event: APIGatewayProxyEvent
): Promise<void | Other.Type.LambdaResponse> {
  logger.info('method invoked');
  const payload: any = event.body || {};

  /**
   * ------------------------------------
   * GITHUB WEBHOOK AUTHENTICATION
   * ------------------------------------
   * Generate token to compare with x-hub-signature-256
   * so that we can allow only github webhook requests
   *
   */
  const sig = Buffer.from(event.headers['x-hub-signature-256'] || '');
  const hmac = Buffer.from(
    'sha256' +
      '=' +
      crypto.createHmac('sha256', Config.GITHUB_WEBHOOK_SECRET).update(payload).digest('hex')
  );

  console.log('SIG - HMAC (CryptoJS): ', hmac.toString());
  logger.info(event.headers);
  console.log('REQUEST CONTEXT---------', event.requestContext);
  const reqContext = event.requestContext as typeof event.requestContext & {
    timeEpoch: number;
  };
  const eventTime = reqContext.timeEpoch;

  console.log('time epoch -------', new Date(eventTime));
  if (sig.length !== hmac.length || !crypto.timingSafeEqual(hmac, sig)) {
    logger.error('Webhook request not validated');
    return {
      statusCode: 403,
      body: 'Permission Denied',
    };
  }
  const data = JSON.parse(event.body || '{}');
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
      await new SQSClient().sendMessage(
        { ...data.repository, action: data.action },
        Queue.gh_repo_format.queueUrl
      );
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
          name,
          id: Buffer.from(`${repo_id}_${name}`, 'binary').toString('base64'),
          action: Github.Enums.Branch.Deleted,
          repo_id,
          deleted_at: true,
        };
      }
      logger.info('-------Branch event --------');
      logger.info(obj);
      await new SQSClient().sendMessage(obj, Queue.gh_branch_format.queueUrl);
      break;

    case Github.Enums.Event.Organization:
      if (!data?.membership) {
        break;
      }

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
      }
      logger.info('-------User event --------');
      logger.info(obj);
      await new SQSClient().sendMessage(obj, Queue.gh_users_format.queueUrl);
      break;
    case Github.Enums.Event.Commit:
      const commitData: Github.ExternalType.Webhook.Commit = data;
      await getCommits(commitData);
      break;
    case Github.Enums.Event.PullRequest:
      await pROnQueue(data.pull_request, data.action);
      break;
    case Github.Enums.Event.PRReviewComment:
      await pRReviewCommentOnQueue(
        data.comment,
        data.pull_request.id,
        data.repository.id,
        data.repository.name,
        data.repository.owner.login,
        data.pull_request.number,
        data.action
      );
      break;
    case Github.Enums.Event.PRReview:
      await pRReviewOnQueue(
        data.review,
        data.pull_request.id,
        data.repository.id,
        data.repository.name,
        data.repository.owner.login,
        data.pull_request.number
      );
      break;
    default:
      break;
  }
};
