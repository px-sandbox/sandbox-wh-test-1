/* eslint-disable max-lines-per-function */
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { v4 as uuid } from 'uuid';
import { Github } from 'abstraction';
import { mappingPrefixes } from '../../../constant/config';
import { getTimezoneOfUser } from '../../../lib/get-user-timezone';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { getWorkingTime } from '../../../util/timezone-calculation';

const sqsClient = SQSClient.getInstance();

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
            action: Github.Enums.PullRequest.Opened,
          },
          Queue.qGhPrFormat.queueUrl,
          { requestId, resourceId },
          octokitRespData.id,
          uuid()
        );
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhHistoricalPrByNumber.queueUrl, error as Error);
        logger.error({
          message: 'historical.pr.number.error',
          error: `${error}`,
          requestId,
          resourceId,
        });
      }
    })
  );
};
