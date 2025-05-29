/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { logProcessToRetry } from 'rp';
import { processFileChanges } from '../../../util/process-commit-changes';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { searchedDataFormator } from '../../../util/response-formatter';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';

const esclient = ElasticSearchClient.getInstance();

interface CommitFileChange {
  filename: string;
  additions: number;
  deletions: number;
  changes: number;
  status: string;
  raw_url: string;
  blob_url: string;
  patch: string;
}

async function getRepoNameById(repoId: string): Promise<string> {
  const query = esb.requestBodySearch().query(esb.matchQuery('body.id', repoId)).toJSON();
  const repoData = await esclient.search(Github.Enums.IndexName.GitRepo, query);
  const [repoName] = await searchedDataFormator(repoData);
  if (!repoName) {
    throw new Error(`repoName not found for data: ${repoId}`);
  }
  logger.info({ message: 'repoData', data: { repoName: repoName.name } });
  return repoName.name;
}
export const handler = async function commitFormattedDataReciever(event: SQSEvent): Promise<void> {
  logger.info({ message: 'Records Length', data: event.Records.length });

  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const {
        reqCtx: { requestId, resourceId },
        message: messageBody,
      } = JSON.parse(record.body);
      try {
        logger.info({
          message: 'COMMIT_FILE_CHANGES_HANDLER_FORMATTER',
          data: {
            commitId: messageBody.githubCommitId,
          },
          requestId,
          resourceId,
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
        const installationAccessToken = await getInstallationAccessToken(repoOwner);
        const octokit = ghRequest.request.defaults({
          headers: {
            Authorization: `Bearer ${installationAccessToken.body.token}`,
          },
        });
        const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
        const responseData = (await octokitRequestWithTimeout(
          `GET /repos/${repoOwner}/${repoName}/commits/${githubCommitId}`
        )) as OctokitResponse<CommitFileChange>;
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

        logger.info({
          message: 'FILE_COUNT',
          data: responseData.data.files.length,
          requestId,
          resourceId,
        });
        const commitProcessor = new CommitProcessor(
          {
            ...getOctokitResp(responseData),
            commits: {
              id: githubCommitId,
              isMergedCommit,
              mergedBranch,
              pushedBranch,
              createdAt,
            },
            repoId: repoId.replace(/gh_repo_/g, ''),
          },
          requestId,
          resourceId
        );
        const data = await commitProcessor.processor();
        await commitProcessor.save({ data, eventType: Github.Enums.Event.Commit });
      } catch (error) {
        logger.error({
          message: 'migrate-commitFormattedDataReceiver',
          error,
          requestId,
          resourceId,
        });
        await logProcessToRetry(record, Queue.qGhCommitFileChanges.queueUrl, error as Error);
      }
    })
  );
};
