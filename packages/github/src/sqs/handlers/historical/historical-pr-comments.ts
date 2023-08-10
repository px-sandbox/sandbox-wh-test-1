import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPRCommentsData(event: SQSEvent): Promise<any> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  let page = 1;
  const perPage = 100;
  await Promise.all(
    event.Records.map(async (record: any) => {
      logger.info(`PR_NUMBER: ${record.body.number} '--' REPO_NAME: ${record.body.head.repo.name}`);
      await getPrComments(JSON.parse(record.body), perPage, page, octokit);
    })
  );
};
async function getPrComments(
  messageBody: any,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  try {
    const commentsDataOnPr = await octokit(
      `GET /repos/${messageBody.head.repo.owner.login}/${messageBody.head.repo.name}/pulls/${messageBody.number}/comments?per_page=${perPage}&page=${page}`
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

    if (commentsDataOnPr.data.length < perPage) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      page++;
      await getPrComments(messageBody, perPage, page, octokit);
    }
  } catch (error) {
    logger.error('historical.comments.error');
    throw error;
  }
}
