import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { CommitProcessor } from 'src/processors/commit';
import { Queue } from 'sst/node/queue';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from 'src/lib/request-defaults';
import { mappingPrefixes } from 'src/constant/config';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ParamsMapping } from 'src/model/params-mapping';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { searchedDataFormator } from 'src/util/response-formatter';

export const handler = async function commitFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);

  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        // Do something with the message, e.g. send an email, process data, etc.
        /*  USE SWITCH CASE HERE FOT HANDLE WEBHOOK AND REST API CALLS FROM SQS */
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
        //CHECK DATA EXISTS IN ELASTICSEARCH

        const commitSearchQuery = esb.matchQuery('body.githubCommitId', commitId);
        const searchInEsb = await new ElasticSearchClient({
          host: Config.OPENSEARCH_NODE,
          username: Config.OPENSEARCH_USERNAME ?? '',
          password: Config.OPENSEARCH_PASSWORD ?? '',
        }).searchWithEsb(Github.Enums.IndexName.GitCommits, commitSearchQuery);
        const esData = await searchedDataFormator(searchInEsb);
        if (esData.length > 0) {
          logger.info('COMMIT_FOUND_IN_ELASTICSEARCH', { esData });
          return false;
        }
        // CHECK DATA EXISTS IN DYNAMODB
        // const commitSha = `${mappingPrefixes.commit}_${commitId}`;
        // const records = await new DynamoDbDocClient().find(
        //   new ParamsMapping().prepareGetParams(commitSha)
        // );
        // if (records) {
        //   logger.info('COMMIT_FOUND_IN_DYNAMODB', { records });
        //   return false;
        // }
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
        logger.error('commitFormattedDataReciever', error);
      }
    })
  );
};
