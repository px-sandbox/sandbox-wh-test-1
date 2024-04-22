import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Github } from 'abstraction';
import { OctokitResponse } from '@octokit/types';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from 'rp';
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
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const messageBody = JSON.parse(record.body);
      try {
        logger.info('UPDATE_MERGE_COMMIT_SQS_RECEIVER', { messageBody });
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
          logger.info(`parent_commit_found_for_commit_id:  ${githubCommitId}`);
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
          });
          const data = await commitProcessor.processor();
          await commitProcessor.save({ data, eventType: Github.Enums.Event.Commit });
        }
      } catch (error) {
        logger.error('updateMergeCommitFormattedDataReceiver', error);
        await logProcessToRetry(record, Queue.qUpdateMergeCommit.queueUrl, error as Error);
      }
    })
  );
};
