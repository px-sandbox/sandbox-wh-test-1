import { OctokitResponse } from '@octokit/types';
import async, { ErrorCallback } from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import _ from 'lodash';
import { logProcessToRetry } from 'rp';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { CommitProcessor } from '../../../processors/commit';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { processFileChanges } from '../../../util/process-commit-changes';

interface CommitResponse {
  files: {
    filename: string;
    additions: number;
    deletions: number;
    changes: number;
    status: string;
    raw_url: string;
    blob_url: string;
    patch?: string;
  }[];
  parents: { sha: string; url: string }[];
  commit: {
    message: string;
    committer: {
      name: string;
      email: string;
      date: string;
    };
  };
  stats: {
    total: number;
  };
  author?: {
    id: string;
    login: string;
  };
  committer: {
    id: string;
  };
}

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
      processId,
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
    )) as OctokitResponse<CommitResponse>;
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
    const processor = new CommitProcessor(
      {
        repoId,
        commits: {
          id: commitId,
          isMergedCommit,
          mergedBranch,
          pushedBranch,
          timestamp,
          orgId,
          committer: {
            username: responseData.data.commit.committer.name,
            email: responseData.data.commit.committer.email,
          },
          message: responseData.data.commit.message,
        },
        timestamp: responseData.data.commit.committer.date,
        author: responseData.data.author || { login: '', id: '' },
        commit: {
          message: responseData.data.commit.message,
          committer: {
            id: 0, // We don't have this in the response
            login: responseData.data.commit.committer.name,
            date: responseData.data.commit.committer.date,
          },
        },
        stats: {
          total: String(responseData.data.stats.total),
        },
        committer: responseData.data.committer || { id: '' },
        files: [
          {
            filename: responseData.data.files[0].filename,
            additions: String(responseData.data.files[0].additions),
            deletions: String(responseData.data.files[0].deletions),
            changes: String(responseData.data.files[0].changes),
            status: responseData.data.files[0].status,
          },
        ] as [
          {
            filename: string;
            additions: string;
            deletions: string;
            changes: string;
            status: string;
          }
        ],
      },
      requestId,
      resourceId,
      processId
    );
    await processor.process();
    await processor.save();
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
            ((error: Error | null) => {
              if (error) {
                logger.error({ message: 'commitFormattedDataReceiver.error', error });
              }
              resolve('DONE');
            }) as ErrorCallback<Error>
          );
        })
    )
  );
};
