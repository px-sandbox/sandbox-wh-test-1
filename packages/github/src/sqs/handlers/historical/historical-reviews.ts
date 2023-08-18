import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getOctokitResp } from 'src/util/octokit-response';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPrReviewsData(event: SQSEvent): Promise<any> {
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
        return true;
      }

      logger.info(`
      PR with no repo: ${JSON.stringify(body)}
      `);

      return false;
    }).map(async (record: any) => {
      await getPrReviews(record, octokit);
    })
  );
};

async function getPrReviews(
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
    const prReviews = await octokit(
      `GET /repos/${owner.login}/${name}/pulls/${number}/reviews?per_page=50&page=${page}`
    );
    const octokitRespData = getOctokitResp(prReviews);
    let queueProcessed = [];
    queueProcessed = octokitRespData.map((reviews: any) =>
      new SQSClient().sendMessage(
        {
          review: reviews,
          pullId: messageBody.id,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_pr_review_format.queueUrl
      )
    );

    await Promise.all(queueProcessed);

    if (page === 1) {
      let submittedAt = null;
      let approvedAt = null;
      const reviewAt = await prReviews.data.find(
        (commentState: any) => commentState.state === 'COMMENTED'
      );
      const approvedTime = await prReviews.data.find(
        (commentState: any) => commentState.state === 'APPROVED'
      );

      const minimumActionDates = [
        reviewAt?.submitted_at,
        messageBody?.merged_at,
        approvedTime?.submitted_at,
      ]
        .filter((item) => !!item)
        .map((date) => moment(date).unix());

      if (minimumActionDates.length === 0) {
        submittedAt = null;
      } else {
        submittedAt = moment.unix(Math.min(...minimumActionDates));
      }

      if (approvedTime) {
        if (!messageBody.approved_at) {
          approvedAt = approvedTime.submitted_at;
        }
      }
      await new SQSClient().sendMessage(
        {
          submittedAt: submittedAt,
          approvedAt: approvedAt,
          owner: messageBody.head.repo.owner.login,
          repoName: messageBody.head.repo.name,
          prNumber: messageBody.number,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_historical_pr_by_number.queueUrl
      );
    }

    if (octokitRespData.length < 50) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      messageBody.page = page + 1;
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_reviews.queueUrl);
    }
  } catch (error) {
    logger.error('historical.reviews.error', { error });
    await logProcessToRetry(record, Queue.gh_historical_reviews.queueUrl, error);
  }
}
