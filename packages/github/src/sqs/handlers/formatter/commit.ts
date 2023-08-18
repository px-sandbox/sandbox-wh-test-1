import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { ghRequest } from 'src/lib/request-defaults';
import { CommitProcessor } from 'src/processors/commit';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { searchedDataFormator } from 'src/util/response-formatter';
import { logProcessToRetry } from 'src/util/retry-process';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

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
        const installationAccessToken = await getInstallationAccessToken();
        const octokit = ghRequest.request.defaults({
          headers: {
            Authorization: `Bearer ${installationAccessToken.body.token}`,
          },
        });

        const responseData = await octokit(
          `GET /repos/${repoOwner}/${repoName}/commits/${commitId}`
        );

        const commitProcessor = new CommitProcessor({
          ...responseData.data,
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
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_commit_format.queueUrl, error);
        logger.error('commitFormattedDataReciever', error);
      }
    })
  );
};
