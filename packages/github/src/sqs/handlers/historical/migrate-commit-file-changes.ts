import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { processFileChanges } from '../../../util/process-commit-changes';
import { logProcessToRetry } from 'rp';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { searchedDataFormator } from '../../../util/response-formatter';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
const esclient = ElasticSearchClient.getInstance();

async function getRepoNameById(repoId: string): Promise<string> {
  const query = esb.requestBodySearch().query(esb.matchQuery('body.id', repoId)).toJSON();
  const repoData = await esclient.search(Github.Enums.IndexName.GitRepo, query);
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
        const responseData = (await octokitRequestWithTimeout(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        )) as OctokitResponse<any>;
        const filesLink = responseData.headers.link;
        if (filesLink) {
          const files = await processFileChanges(
            responseData.data.files,
            filesLink,
            octokitRequestWithTimeout
          );
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
        const data = await commitProcessor.processor();
        await commitProcessor.save({ data, eventType: Github.Enums.Event.Commit });
      } catch (error) {
        logger.error('migrate-commitFormattedDataReciever', error);
        await logProcessToRetry(record, Queue.qGhCommitFileChanges.queueUrl, error as Error);
      }
    })
  );
};
