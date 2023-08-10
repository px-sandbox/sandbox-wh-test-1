import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  let page = 1;
  const perPage = 100;
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    await getRepoCommits(
      messageBody.owner,
      messageBody.name,
      messageBody.githubRepoId,
      perPage,
      page,
      octokit
    );
  }
};
async function getRepoCommits(
  owner: string,
  name: string,
  githubRepoId: string,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  try {
    console.log('REPO_IDDD', name, githubRepoId);
    const commitDataOnPr = await octokit(
      `GET /repos/${owner}/${name}/commits?per_page=${perPage}&page=${page}`
    );

    commitDataOnPr.data.map(async (commitData: any) => {
      commitData.isMergedCommit = false;
      commitData.mergedBranch = null;
      commitData.pushedBranch = null;
      await new SQSClient().sendMessage(
        {
          commitId: commitData.sha,
          isMergedCommit: commitData.isMergedCommit,
          mergedBranch: commitData.mergedBranch,
          pushedBranch: commitData.pushedBranch,
          repository: {
            id: githubRepoId,
            name: name,
            owner: owner,
          },
          timestamp: new Date(),
        },
        Queue.gh_commit_format.queueUrl
      );
    });
    await new SQSClient().sendMessage(
      { owner, name, isCommit: true },
      Queue.gh_historical_pr.queueUrl
    );
    //commits from PR
    page++;
    if (commitDataOnPr.data.length < perPage) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      page++;
      await getRepoCommits(owner, name, githubRepoId, perPage, page, octokit);
    }
  } catch (error) {
    logger.error('historical.commits.error');
    throw error;
  }
}
