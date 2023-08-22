import moment from 'moment';
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

export const handler = async function collectPrReviewsData(event: SQSEvent): Promise<any> {
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
      await getPrReviews(record);
    })
  );
};

async function getPrReviews(record: any) {
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
      `GET /repos/${owner.login}/${name}/pulls/${number}/reviews?per_page=100&page=${page}`
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
    logger.info(`total pr reviews proccessed: ${queueProcessed.length}`);
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
          submittedAt,
          approvedAt,
          owner: messageBody.head.repo.owner.login,
          repoName: messageBody.head.repo.name,
          prNumber: messageBody.number,
          repoId: messageBody.head.repo.id,
        },
        Queue.gh_historical_pr_by_number.queueUrl
      );
    }

    if (octokitRespData.length < 100) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return true;
    } else {
      messageBody.page = page + 1;
      logger.info(`message_body_pr_reviews: ${JSON.stringify(messageBody)}`);
      // await new SQSClient().sendMessage(messageBody, Queue.gh_historical_reviews.queueUrl);
      await getPrReviews({ body: JSON.stringify(messageBody) });
    }
  } catch (error) {
    logger.error(`historical.reviews.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.gh_historical_reviews.queueUrl, error);
  }
}
