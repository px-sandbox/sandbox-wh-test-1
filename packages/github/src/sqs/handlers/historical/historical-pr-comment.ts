import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitResp } from '../../../util/octokit-response';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
export const handler = async function collectPRCommentsData(event: SQSEvent): Promise<any> {
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.head && body.head.repo) {
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
    }).map(async (record: any) => {
      await getPrComments(record);
    })
  );
};
async function getPrComments(record: any) {
  const messageBody = JSON.parse(record.body);
  if (!messageBody && !messageBody.head) {
    logger.info('HISTORY_MESSGE_BODY_EMPTY', messageBody);
    return;
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
    queueProcessed = octokitRespData.map((comments: any) =>
      new SQSClient().sendMessage(
        {
          comment: comments,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_pr_review_comment_format.queueUrl
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
      // await new SQSClient().sendMessage(messageBody, Queue.gh_historical_pr_comments.queueUrl);
      await getPrComments({ body: JSON.stringify(messageBody) });
    
  } catch (error) {
    logger.error(`historical.comments.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.gh_historical_pr_comments.queueUrl, error);
  }
}
