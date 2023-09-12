import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from 'src/util/retry-process';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});

async function processFileChanges<T>(
  files: Array<T>,
  filesLink: string | undefined
): Promise<Array<T>> {
  let nextFilesLink = filesLink;
  let filesChanges = files;
  try {
    if (!nextFilesLink) {
      return filesChanges;
    }
    const nextLinkRegex = /<([^>]+)>;\s*rel="next"/;
    const nextLinkMatch = nextFilesLink.match(nextLinkRegex);
    if (!nextLinkMatch) {
      return filesChanges;
    }
    const response = await octokit(`GET ${nextLinkMatch[1]}`);
    filesChanges = [...files, ...response.data.files];
    nextFilesLink = response.headers.link;
    return processFileChanges(filesChanges, nextFilesLink);
  } catch (error) {
    logger.error('ERROR_IN_PROCESS_FILE_CHANGES_COMMIT', error);
    throw error;
  }
}

export const handler = async function commitFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const messageBody = JSON.parse(record.body);
      try {
        logger.info('COMMIT_FILE_CHANGES_HANDLER_FORMATER', { messageBody });
        const {
          githubCommitId,
          isMergedCommit,
          mergedBranch,
          pushedBranch,
          repoId,
          repoName,
          repoOwner,
          createdAt,
        } = messageBody;
        console.log('githubCommitId', githubCommitId);
        const responseData = await octokit(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        );
        const filesLink = responseData.headers.link;
        if (filesLink) {
          const files = await processFileChanges(responseData.data.files, filesLink);
          responseData.data.files = files;
        }

        logger.info(`FILE_COUNT: ${responseData.data.files.length}`);
        const commitProcessor = new CommitProcessor({
          ...getOctokitResp(responseData),
          commits: {
            id: githubCommitId,
            isMergedCommit,
            mergedBranch,
            pushedBranch,
            createdAt,
          },
          repoId,
        });

        const validatedData = commitProcessor.validate();
        if (!validatedData) {
          logger.error('commitFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await commitProcessor.processor();
        await commitProcessor.sendDataToQueue(data, Queue.gh_commit_index.queueUrl);
      } catch (error) {
        logger.error('commitFormattedDataReciever', error);
        await logProcessToRetry(record, Queue.gh_commit_file_changes.queueUrl, error as Error);
      }
    })
  );
};
