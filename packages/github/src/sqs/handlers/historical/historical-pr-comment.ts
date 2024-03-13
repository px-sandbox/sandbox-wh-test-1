import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitResp } from '../../../util/octokit-response';

const sqsClient = SQSClientGh.getInstance();
const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
async function getPrComments(record: SQSRecord): Promise<boolean | undefined> {
  const messageBody = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return false;
  }
  const {
    page = 1,
    number,
    head: {
      repo: { owner, name },
    },
  } = messageBody;

  try {
    const commentsDataOnPr = await octokit(
      `GET /repos/${owner.login}/${name}/pulls/${number}/comments?per_page=100&page=${page}`
    );
    const octokitRespData = getOctokitResp(commentsDataOnPr);
    let queueProcessed = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queueProcessed = octokitRespData.map((comments: any) =>
      sqsClient.sendMessage(
        {
          comment: comments,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.qGhPrReviewCommentFormat.queueUrl
      )
    );
    await Promise.all(queueProcessed);
    logger.info(`total pr comments proccessed: ${queueProcessed.length}`);
    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR_COMMENT');
      return true;
    }
    messageBody.page = page + 1;
    logger.info(`message_body_pr_comments: ${JSON.stringify(messageBody)}`);
    await getPrComments({ body: JSON.stringify(messageBody) } as SQSRecord);
  } catch (error) {
    logger.error(`historical.comments.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.qGhHistoricalPrComments.queueUrl, error as Error);
  }
}

export const handler = async function collectPRCommentsData(event: SQSEvent): Promise<undefined> {
  await Promise.all(
    event.Records.filter((record) => {
      const body = JSON.parse(record.body);
      if (body.head?.repo) {
        logger.info(
          `PR with repo: ${body}
      `
        );
        return true;
      }

      logger.info(`
      PR with no repo: ${body}
      `);

      return false;
    }).map(async (record) => getPrComments(record))
  );
};
