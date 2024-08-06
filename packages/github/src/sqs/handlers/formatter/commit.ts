import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import _ from 'lodash';
import { Github } from 'abstraction';
import async from 'async';
import { OctokitResponse } from '@octokit/types';
import { logProcessToRetry } from 'rp';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { processFileChanges } from '../../../util/process-commit-changes';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

// eslint-disable-next-line max-lines-per-function
async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  const {
    reqCtx: { requestId, resourceId },
    message: messageBody,
  } = JSON.parse(record.body);

  try {
    logger.info({
      message: 'COMMIT_SQS_RECEIVER_HANDLER_FORMATTER',
      data: messageBody,
      requestId,
      resourceId,
    });
    const {
      commitId,
      mergedBranch,
      pushedBranch,
      repository: { id: repoId, name: repoName, owner: repoOwner, ownerId: orgId },
      timestamp,
    } = messageBody;
    let { isMergedCommit } = messageBody;
    /**
     * ------------------------------------
     * Get commit details from Github API
     * ------------------------------------
     */
    const installationAccessToken = await getInstallationAccessToken(repoOwner);
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
    const responseData = (await octokitRequestWithTimeout(
      `GET /repos/${repoOwner}/${repoName}/commits/${commitId}`
    )) as OctokitResponse<any>;
    const filesLink = responseData.headers.link;
    if (filesLink) {
      const files = await processFileChanges(
        responseData.data.files,
        filesLink,
        octokitRequestWithTimeout,
        { requestId, resourceId }
      );
      responseData.data.files = files;
    }
    const parentCommit = responseData.data.parents.length >= 2;
    if (parentCommit) {
      logger.info({
        message: 'parent_commit_found_for_commit_id',
        data: { commitId },
        requestId,
        resourceId,
      });
      isMergedCommit = true;
    }

    logger.info({
      message: 'FILE_COUNT:',
      data: responseData.data.files.length,
      requestId,
      resourceId,
    });
    const commitProcessor = new CommitProcessor(
      {
        ...getOctokitResp(responseData),
        commits: {
          id: commitId,
          isMergedCommit,
          mergedBranch,
          pushedBranch,
          timestamp,
          orgId,
        },
        repoId,
      },
      requestId,
      resourceId
    );
    const data = await commitProcessor.processor();
    await commitProcessor.save({
      data,
      eventType: Github.Enums.Event.Commit,
      processId: messageBody?.processId,
    });
  } catch (error) {
    logger.error({ message: `commitFormattedDataReceiver.error, ${error}`, requestId, resourceId });
    await logProcessToRetry(record, Queue.qGhCommitFormat.queueUrl, error as Error);
  }
}
export const handler = async function commitFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info({ message: `Records Length: ${event.Records.length}` });
  const messageGroups = _.groupBy(event.Records, (record) => record.attributes.MessageGroupId);
  await Promise.all(
    Object.values(messageGroups).map(
      async (group) =>
        new Promise((resolve) => {
          async.eachSeries(
            group,
            async (item: SQSRecord) => {
              await processAndStoreSQSRecord(item);
            },
            (error: any) => {
              if (error) {
                logger.error({ message: 'commitFormattedDataReceiver.error', error });
              }
              resolve('DONE');
            }
          );
        })
    )
  );
};
