import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/requestDefaults';
import { getInstallationAccessToken } from 'src/util/installationAccessTokenGenerator';
import { logProcessToRetry } from 'src/util/retryProcess';
import { Queue } from 'sst/node/queue';

export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name && body.branchName) {
        return true;
      }

      logger.info(`
      COMMIT_MESSAGE_BODY: ${body}
      `);

      return false;
    }).map(async (record: any) => {
      await getRepoCommits(record, octokit);
    })
  );
};
async function getRepoCommits(
  record: any,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const messageBody = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId, branchName } = messageBody;
  try {
    const last_one_year_date = moment('2022-01-01', 'YYYY-MM-DD').toISOString();
    const commitDataOnPr = await octokit(
      `GET /repos/${owner}/${name}/commits?sha=${branchName}&per_page=100&page=${page}&sort=created&direction=asc&since=${last_one_year_date}`
    );
    let queueProcessed = [];
    queueProcessed = commitDataOnPr.data.map((commitData: any) =>
      new SQSClient().sendMessage(
        {
          commitId: commitData.sha,
          isMergedCommit: false,
          mergedBranch: null,
          pushedBranch: null,
          repository: {
            id: githubRepoId,
            name: name,
            owner: owner,
          },
          timestamp: new Date(),
        },
        Queue.gh_commit_format.queueUrl,
        commitData.sha
      )
    );
    await Promise.all(queueProcessed);

    if (commitDataOnPr.data.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      messageBody.page = page + 1;
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_commits.queueUrl);
    }
  } catch (error) {
    await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
    logger.error(JSON.stringify({ message: 'historical.commits.error', error }));
  }
}
