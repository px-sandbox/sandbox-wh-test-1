import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { processFileChanges } from '../../../util/process-commit-changes';
import { logProcessToRetry } from '../../../util/retry-process';
import async from 'async';
import { Github } from 'abstraction';

// eslint-disable-next-line max-lines-per-function
async function processAndStoreSQSRecord(record: SQSRecord): Promise<void> {
  try {
    const messageBody = JSON.parse(record.body);
    logger.info('COMMIT_SQS_RECEIVER_HANDLER_FORMATTER', { messageBody });
    const {
      commitId,
      mergedBranch,
      pushedBranch,
      repository: { id: repoId, name: repoName, owner: repoOwner },
      timestamp,
    } = messageBody;

    let { isMergedCommit } = messageBody;
    /**
     * ------------------------------------
     * Get commit details from Github API
     * ------------------------------------
     */
    const installationAccessToken = await getInstallationAccessToken();
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    const responseData = await octokit(`GET /repos/${repoOwner}/${repoName}/commits/${commitId}`);
    const filesLink = responseData.headers.link;
    if (filesLink) {
      const files = await processFileChanges(responseData.data.files, filesLink, octokit);
      responseData.data.files = files;
    }
    const parentCommit = responseData.data.parents.length >= 2;
    if (parentCommit) {
      logger.info(`parent_commit_found_for_commit_id:  ${commitId}`);
      isMergedCommit = true;
    }

    logger.info(`FILE_COUNT: ${responseData.data.files.length}`);
    const commitProcessor = new CommitProcessor({
      ...getOctokitResp(responseData),
      commits: {
        id: commitId,
        isMergedCommit,
        mergedBranch,
        pushedBranch,
        timestamp,
      },
      repoId,
    });

    const validatedData = commitProcessor.validate();
    if (!validatedData) {
      logger.error('commitFormattedDataReceiver.error', { error: 'validation failed' });
      return;
    }
    const data = await commitProcessor.processor();
    await commitProcessor.save({ data, eventType: Github.Enums.Event.Commit });
  } catch (error) {
    logger.error(`commitFormattedDataReceiver.error, ${error}`);
    await logProcessToRetry(record, Queue.qGhCommitFormat.queueUrl, error as Error);
  }
}
export const handler = async function commitFormattedDataReceiver(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await async.eachSeries(event.Records, processAndStoreSQSRecord, (error) => {
    if (error) {
      logger.error(`commitFormattedDataReceiver.error, ${error}`);
    }
  });
};
