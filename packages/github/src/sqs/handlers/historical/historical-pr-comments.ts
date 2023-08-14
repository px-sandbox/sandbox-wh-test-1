import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPRCommentsData(event: SQSEvent): Promise<any> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });

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
      await getPrComments(record, octokit);
    })
  );
};
async function getPrComments(
  record: any,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
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
    commentsDataOnPr.data.map(async (comments: any) => {
      await new SQSClient().sendMessage(
        {
          comment: comments,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_pr_review_comment_format.queueUrl
      );
    });

    if (commentsDataOnPr.data.length < 100) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      messageBody.page = page + 1;
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_pr_comments.queueUrl);
    }
  } catch (error) {
    await logProcessToRetry(record, Queue.gh_historical_pr_comments.queueUrl, error);
    logger.error('historical.comments.error', { error });
  }
}
