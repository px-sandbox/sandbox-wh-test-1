import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getWorkingTime } from 'src/util/timezone-calculation';
import { Queue } from 'sst/node/queue';

export const handler = async function collectReviewsData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const record = event.Records[0];
  const messageBody = JSON.parse(record.body);
  logger.info('PULL_REQUEST_DATA', { body: messageBody });
  const dataOnPr = await octokit(
    `GET /repos/${messageBody.owner}/history/pulls/${messageBody.prNumber}`
  );
  // const createdTimezone = await getTimezoneOfUser(
  //   `${mappingPrefixes.user}_${dataOnPr.data.user.id}`
  // );
  const review_seconds = await getWorkingTime(
    moment(dataOnPr.data.created_at),
    moment(messageBody.submittedAt),
    '+5:30'
  );

  new SQSClient().sendMessage(
    {
      ...dataOnPr.data,
      reviewed_at: messageBody.submittedAt,
      approved_at: messageBody.approvedAt,
      review_seconds: review_seconds,
      action: Github.Enums.Comments.REVIEW_COMMENTED,
    },
    Queue.gh_pr_format.queueUrl
  );
};
