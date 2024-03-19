import moment from 'moment';
import { SQSClient, SQSClientGh } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../../../constant/config';
import { getTimezoneOfUser } from '../../../lib/get-user-timezone';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { logProcessToRetry } from '../../../util/retry-process';
import { getWorkingTime } from '../../../util/timezone-calculation';
import { getOctokitResp } from '../../../util/octokit-response';
import { v4 as uuid } from 'uuid';

const sqsClient = SQSClientGh.getInstance();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processQueueOnMergedPR(octokitRespData: any, messageBody: any): Promise<void> {
  await sqsClient.sendFifoMessage(
    {
      commitId: octokitRespData.merge_commit_sha,
      isMergedCommit: octokitRespData.merged,
      mergedBranch: null,
      pushedBranch: octokitRespData?.head?.ref,
      repository: {
        id: messageBody.repoId,
        name: messageBody.repoName,
        owner: messageBody.owner,
      },
      timestamp: new Date(),
    },
    Queue.qGhCommitFormat.queueUrl,
    octokitRespData.merge_commit_sha,
    uuid()
  );
}
export const handler = async function collectPrByNumberData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  await Promise.all(
    event.Records.map(async (record) => {
      const messageBody = JSON.parse(record.body);

      logger.info('HISTORY_PULL_REQUEST_DATA', { body: messageBody });
      try {
        const dataOnPr = await octokit(
          `GET /repos/${messageBody.owner}/${messageBody.repoName}/pulls/${messageBody.prNumber}`
        );
        const octokitRespData = getOctokitResp(dataOnPr);
        const createdTimezone = await getTimezoneOfUser(
          `${mappingPrefixes.user}_${octokitRespData.user.id}`
        );

        if (
          messageBody.approved_at &&
          moment(messageBody.approved_at).isBefore(moment(messageBody.submitted_at))
        ) {
          messageBody.submittedAt = messageBody.approved_at;
        }

        const reviewSeconds = getWorkingTime(
          moment(octokitRespData.created_at),
          moment(messageBody.submittedAt),
          createdTimezone
        );

        await sqsClient.sendFifoMessage(
          {
            ...octokitRespData,
            reviewed_at: messageBody.submittedAt,
            approved_at: messageBody.approvedAt,
            review_seconds: reviewSeconds,
          },
          Queue.qGhPrFormat.queueUrl,
          octokitRespData.id,
          uuid()
        );

        // setting the `isMergedCommit` for commit
        if (octokitRespData.merged === true) {
          await processQueueOnMergedPR(octokitRespData, messageBody);
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhHistoricalPrByNumber.queueUrl, error as Error);
        logger.error(`historical.pr.number.error: ${JSON.stringify(error)}`);
      }
    })
  );
};
