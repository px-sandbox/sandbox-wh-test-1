import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { logProcessToRetry } from 'rp';
import { Github } from 'abstraction';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

async function getPrComments(record: SQSRecord): Promise<boolean | undefined> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);
  try {
    if (!messageBody && !messageBody.head) {
      logger.info({
        message: 'HISTORY_MESSGE_BODY_EMPTY',
        data: messageBody,
        requestId,
        resourceId,
      });
      return false;
    }
    const {
      page = 1,
      number,
      head: {
        repo: {
          owner: { login },
          name,
        },
      },
    } = messageBody;
    const sqsClient = SQSClient.getInstance();
    const installationAccessToken = await getInstallationAccessToken(login);
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

    const commentsDataOnPr = (await octokitRequestWithTimeout(
      `GET /repos/${login}/${name}/pulls/${number}/comments?per_page=100&page=${page}`
    )) as OctokitResponse<any>;
    const octokitRespData = getOctokitResp(commentsDataOnPr);
    let queueProcessed = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueProcessed = octokitRespData.map((comments: any) =>
      sqsClient.sendMessage(
        {
          comment: comments,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
          orgId: messageBody.head.repo.owner.id,
          action: Github.Enums.PRReviewComment.Created,
        },
        Queue.qGhPrReviewCommentFormat.queueUrl,
        { requestId, resourceId }
      )
    );
    await Promise.all(queueProcessed);
    logger.info({
      message: 'total pr comments proccessed:',
      data: queueProcessed.length,
      requestId,
      resourceId,
    });
    if (octokitRespData.length < 100) {
      logger.info({ message: 'LAST_100_RECORD_PR_COMMENT', requestId, resourceId });
      return true;
    }
    messageBody.page = page + 1;
    logger.info({
      message: 'message_body_pr_comments',
      data: JSON.stringify(messageBody),
      requestId,
      resourceId,
    });
    await getPrComments({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error({ message: 'historical.comments.error', error, requestId, resourceId });
    await logProcessToRetry(record, Queue.qGhHistoricalPrComments.queueUrl, error as Error);
  }
}

export const handler = async function collectPRCommentsData(event: SQSEvent): Promise<undefined> {
  await Promise.all(
    event.Records.filter((record) => {
      const { message: body } = JSON.parse(record.body);
      if (body.head?.repo) {
        logger.info({
          message: `PR with repo: ${body}
      `,
        });
        return true;
      }

      logger.info({
        message: 'PR with no repo:',
        data: JSON.stringify(body),
      });

      return false;
    }).map(async (record) => getPrComments(record))
  );
};
