import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import { OctokitResponse } from '@octokit/types';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from '../../../util/retry-process';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
export const handler = async function updateMergeCommitDataReceiver(
  event: SQSEvent
): Promise<void> {
  logger.info({ message: "Records Length",  data: event.Records.length});

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const { reqCntx: {requestId, resourceId}, messageBody } = JSON.parse(record.body);
      try {
        logger.info({ message: 'UPDATE_MERGE_COMMIT_SQS_RECEIVER', data:  messageBody, requestId, resourceId });
        const {
          githubCommitId,
          mergedBranch,
          pushedBranch,
          repoId,
          repoName,
          repoOwner,
          createdAt,
        } = messageBody;
        let { isMergedCommit } = messageBody;

        const responseData = (await octokitRequestWithTimeout(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        )) as OctokitResponse<any>;

        const parentCommit = responseData.data.parents.length >= 2;
        if (parentCommit) {
          logger.info({ message: "parent_commit_found_for_commit_id", data: githubCommitId, requestId, resourceId });
          isMergedCommit = true;
          const commitProcessor = new CommitProcessor({
            ...getOctokitResp(responseData),
            commits: {
              id: githubCommitId,
              isMergedCommit,
              mergedBranch,
              pushedBranch,
              timestamp: createdAt,
            },
            repoId: repoId.replace(/gh_repo_/g, ''),
          }, requestId, resourceId);
          const data = await commitProcessor.processor();
          await commitProcessor.save({ data, eventType: Github.Enums.Event.Commit });
        }
      } catch (error) {
        logger.error({ message: 'updateMergeCommitFormattedDataReceiver', error, requestId, resourceId});
        await logProcessToRetry(record, Queue.qUpdateMergeCommit.queueUrl, error as Error);
      }
    })
  );
};
