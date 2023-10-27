import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';
import { processFileChanges } from '../../../util/process-commit-changes';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { searchedDataFormator } from '../../../util/response-formatter';
import { logProcessToRetry } from '../../../util/retry-process';

async function checkCommitExists(isMergedCommit: string, commitId: string): Promise<boolean> {
  const commitSearchQuery = esb.matchQuery('body.githubCommitId', commitId);
  const searchInEsb = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  }).searchWithEsb(Github.Enums.IndexName.GitCommits, commitSearchQuery);
  const [commit] = await searchedDataFormator(searchInEsb);

  if (commit && isMergedCommit === commit.isMergedCommit) {
    logger.info('COMMIT_FOUND_IN_ELASTICSEARCH', { commit });
    return false;
  }
  return true;
}
export const handler = async function commitFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const messageBody = JSON.parse(record.body);
      try {
        logger.info('COMMIT_SQS_RECIEVER_HANDLER_FORMATER', { messageBody });
        const {
          commitId,
          isMergedCommit,
          mergedBranch,
          pushedBranch,
          repository: { id: repoId, name: repoName, owner: repoOwner },
          timestamp,
        } = messageBody;
        /**
         * ------------------------------------
         * Get commit details from Github API
         * ------------------------------------
         */
        // CHECK DATA EXISTS IN ELASTICSEARCH
        
        const check = await checkCommitExists(isMergedCommit, commitId);
        if (check) {
          const installationAccessToken = await getInstallationAccessToken();
          const octokit = ghRequest.request.defaults({
            headers: {
              Authorization: `Bearer ${installationAccessToken.body.token}`,
            },
          });
          const responseData = await octokit(
            `GET /repos/${repoOwner}/${repoName}/commits/${commitId}`
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
            logger.error('commitFormattedDataReciever.error', { error: 'validation failed' });
            return;
          }
          const data = await commitProcessor.processor();
          await commitProcessor.sendDataToQueue(data, Queue.gh_commit_index.queueUrl);
        }
      } catch (error) {
        logger.error('commitFormattedDataReciever', error);
        await logProcessToRetry(record, Queue.gh_commit_format.queueUrl, error as Error);
      }
    })
  );
};
