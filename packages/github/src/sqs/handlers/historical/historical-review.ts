/* eslint-disable max-lines-per-function */
import moment from 'moment';
import { SQSClient } from '@pulse/event-handler';
import { OctokitResponse } from '@octokit/types';
import { Github, Other } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { logProcessToRetry } from 'rp';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const sqsClient = SQSClient.getInstance();

async function processReviewQueueForPageOne(
  prReviews: OctokitResponse<Github.Type.CommentState[]>,
  messageBody: Github.Type.MessageBody,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  let submittedAt = null;
  let approvedAt = null;
  const reviewAt = await prReviews.data.find(
    (commentState: Github.Type.CommentState) => commentState.state === 'COMMENTED'
  );
  const approvedTime = await prReviews.data.find(
    (commentState: Github.Type.CommentState) => commentState.state === 'APPROVED'
  );

  const minimumActionDates = [
    reviewAt?.submitted_at,
    messageBody?.merged_at,
    approvedTime?.submitted_at,
  ]
    .filter((item) => !!item)
    .map((date) => moment(date).unix());

  submittedAt =
    minimumActionDates.length === 0 ? null : moment.unix(Math.min(...minimumActionDates));

  if (approvedTime) {
    if (!messageBody.approved_at) {
      approvedAt = approvedTime.submitted_at;
    }
  }
  await sqsClient.sendMessage(
    {
      submittedAt,
      approvedAt,
      owner: messageBody.head.repo.owner.login,
      repoName: messageBody.head.repo.name,
      prNumber: messageBody.number,
      repoId: messageBody.head.repo.id,
    },
    Queue.qGhHistoricalPrByNumber.queueUrl,
    { ...reqCtx }
  );
}

async function getPrReviews(record: SQSRecord): Promise<boolean | undefined> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info({ message: 'HISTORY_MESSGE_BODY_EMPTY', data: messageBody, requestId, resourceId });
    return false;
  }
  const {
    page = 1,
    number,
    head: {
      repo: { owner, name },
    },
  } = messageBody;
  const installationAccessToken = await getInstallationAccessToken(owner);
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
  try {
    const prReviews = (await octokitRequestWithTimeout(
      `GET /repos/${owner.login}/${name}/pulls/${number}/reviews?per_page=100&page=${page}`
    )) as OctokitResponse<Github.Type.CommentState[]>;
    const octokitRespData = getOctokitResp(prReviews);
    let queueProcessed = [];
    queueProcessed = octokitRespData.map((reviews: unknown) =>
      sqsClient.sendMessage(
        {
          review: reviews,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.qGhPrReviewFormat.queueUrl,
        { requestId, resourceId }
      )
    );

    await Promise.all(queueProcessed);
    logger.info({
      message: 'total pr reviews processed',
      data: queueProcessed.length,
      requestId,
      resourceId,
    });
    if (page === 1) {
      await processReviewQueueForPageOne(prReviews, messageBody, { requestId, resourceId });
    }

    if (octokitRespData.length < 100) {
      logger.info({ message: 'LAST_100_RECORD_PR_REVIEW', requestId, resourceId });
      return true;
    }
    messageBody.page = page + 1;
    logger.info({
      message: `message_body_pr_reviews: ${JSON.stringify(messageBody)}`,
      requestId,
      resourceId,
    });
    await getPrReviews({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error({
      message: 'historical.reviews.error',
      error: JSON.stringify(error),
      requestId,
      resourceId,
    });
    await logProcessToRetry(record, Queue.qGhHistoricalReviews.queueUrl, error as Error);
  }
}

export const handler = async function collectPrReviewsData(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.filter((record: SQSRecord) => {
      const body = JSON.parse(record.body);
      if (body.head?.repo) {
        return true;
      }

      logger.info({
        message: 'PR with no repo',
        data: JSON.stringify(body),
      });

      return false;
    }).map(async (record: SQSRecord) => getPrReviews(record))
  );
};
