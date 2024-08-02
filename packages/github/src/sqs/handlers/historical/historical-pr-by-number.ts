/* eslint-disable max-lines-per-function */
import moment from 'moment';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { logProcessToRetry } from 'rp';
import { Other } from 'abstraction';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { mappingPrefixes } from '../../../constant/config';
import { getTimezoneOfUser } from '../../../lib/get-user-timezone';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getWorkingTime } from '../../../util/timezone-calculation';

const sqsClient = SQSClient.getInstance();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processQueueOnMergedPR(
  octokitRespData: any,
  messageBody: any,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
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
    { ...reqCtx },
    octokitRespData.merge_commit_sha,
    uuid()
  );
}
export const handler = async function collectPrByNumberData(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);

      logger.info({
        message: 'HISTORY_PULL_REQUEST_DATA',
        data: messageBody,
        requestId,
        resourceId,
      });
      try {
        const installationAccessToken = await getInstallationAccessToken(messageBody.owner);
        const octokit = ghRequest.request.defaults({
          headers: {
            Authorization: `Bearer ${installationAccessToken.body.token}`,
          },
        });
        const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
        const dataOnPr = await octokitRequestWithTimeout(
          `GET /repos/${messageBody.owner}/${messageBody.repoName}/pulls/${messageBody.prNumber}`
        );
        const octokitRespData = getOctokitResp(dataOnPr) as any;
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
          { requestId, resourceId },
          octokitRespData.id,
          uuid()
        );

        // setting the `isMergedCommit` for commit
        if (octokitRespData.merged === true) {
          await processQueueOnMergedPR(octokitRespData, messageBody, { requestId, resourceId });
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhHistoricalPrByNumber.queueUrl, error as Error);
        logger.error({ message: 'historical.pr.number.error', error, requestId, resourceId });
      }
    })
  );
};
