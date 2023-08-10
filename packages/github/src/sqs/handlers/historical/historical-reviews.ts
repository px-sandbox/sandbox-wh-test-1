import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectCommitData(event: SQSEvent): Promise<any> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  let page = 1;
  const perPage = 100;
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    logger.info(`PR_NUMBER: ${messageBody.number}`, `REPO_NAME: ${messageBody.head.repo.name}`);
    await getPrReviews(messageBody, perPage, page, octokit);
  }
};
async function getPrReviews(
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
      `GET /repos/${messageBody.head.repo.owner.login}/${messageBody.head.repo.name}/pulls/${messageBody.number}/reviews?per_page=${perPage}&page=${page}`
    );
    let queueProcessed = [];
    queueProcessed = commentsDataOnPr.data.map((comments: any) => {
      new SQSClient().sendMessage(
        {
          review: comments,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_pr_review_format.queueUrl
      );
    });
    await Promise.all(queueProcessed);

    let submittedAt = null;
    let approvedAt = null;
    const reviewAt = await commentsDataOnPr.data.find(
      (commentState: any) => commentState.state === 'COMMENTED'
    );
    const approvedTime = await commentsDataOnPr.data.find(
      (commentState: any) => commentState.state === 'APPROVED'
    );

    const minimumActionDates = [
      reviewAt?.submitted_at,
      messageBody?.merged_at,
      approvedTime?.submitted_at,
    ].filter((item) => !!item);

    if (minimumActionDates.length === 0) {
      submittedAt = null;
    } else {
      submittedAt = moment.unix(Math.min(...minimumActionDates));
      console.log('ELSE_LOG', submittedAt, ...minimumActionDates);
    }

    if (approvedTime) {
      if (!messageBody.approved_at) {
        approvedAt = approvedTime.submitted_at;
      }
    }
    console.log('LAST_LOG', submittedAt);
    await new SQSClient().sendMessage(
      {
        submittedAt: submittedAt,
        approvedAt: approvedAt,
        owner: messageBody.head.repo.owner.login,
        repoName: messageBody.head.repo.name,
        prNumber: messageBody.number,
        repoId: messageBody.head.repo.id,
      },
      Queue.gh_historical_single_number.queueUrl
    );

    if (commentsDataOnPr.data.length < perPage) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      page++;
      await getPrReviews(messageBody, perPage, page, octokit);
    }
  } catch (error) {
    logger.error('historical.reviews.error');
    throw error;
  }
}
