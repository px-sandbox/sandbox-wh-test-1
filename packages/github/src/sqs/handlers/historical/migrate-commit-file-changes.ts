import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { Config } from 'sst/node/config';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { processFileChanges } from '../../../util/process-commit-changes';
import { logProcessToRetry } from '../../../util/retry-process';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { searchedDataFormator } from '../../../util/response-formatter';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});

async function getRepoNameById(repoId: string): Promise<string> {
  const repoData = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  }).search(Github.Enums.IndexName.GitRepo, 'id', repoId);
  const [repoName] = await searchedDataFormator(repoData);
  if (!repoName) {
    throw new Error(`repoName not found for data: ${repoId}`);
  }
  logger.info({ message: 'repoData', repoName: repoName.name });
  return repoName.name;
}
export const handler = async function commitFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const messageBody = JSON.parse(record.body);
      try {
        logger.info('COMMIT_FILE_CHANGES_HANDLER_FORMATER', {
          commitId: messageBody.githubCommitId,
        });
        const {
          githubCommitId,
          isMergedCommit,
          mergedBranch,
          pushedBranch,
          repoId,
          repoOwner,
          createdAt,
        } = messageBody;
        if (!repoId) {
          throw new Error('repoId is missing');
        }
        const repoName = await getRepoNameById(repoId);
        logger.info(`REPO_NAME: ${repoName}`);
        const responseData = await octokit(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        );
        const filesLink = responseData.headers.link;
        if (filesLink) {
          const files = await processFileChanges(responseData.data.files, filesLink, octokit);
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
          repoId: repoId.replace(/gh_repo_/g, ''),
        });

        const validatedData = commitProcessor.validate();
        if (!validatedData) {
          logger.error('migrate-commitFormattedDataReciever.error', { error: 'validation failed' });
          return;
        }
        const data = await commitProcessor.processor();
        await commitProcessor.sendDataToQueue(data, Queue.qGhCommitIndex.queueUrl);
      } catch (error) {
        logger.error('migrate-commitFormattedDataReciever', error);
        await logProcessToRetry(record, Queue.qGhCommitFileChanges.queueUrl, error as Error);
      }
    })
  );
};
