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
  const record = event.Records[0];
  const messageBody = JSON.parse(record.body);
  await getRepoCommits(messageBody.owner, messageBody.name, messageBody.id, perPage, page, octokit);
};
async function getRepoCommits(
  owner: string,
  name: string,
  id: string,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const commitDataOnPr = await octokit(`GET /repos/${owner}/webhook_data/commits`);

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
          id: id,
          name: name,
          owner: owner,
        },
        timestamp: new Date(),
      },
      Queue.gh_commit_format.queueUrl
    );
  });
  page++;
  if (commitDataOnPr.data.length < perPage) {
    logger.info('LAST_100_RECORD_PR');
    return;
  } else {
    page++;
    await getRepoCommits(owner, name, id, perPage, page, octokit);
  }
}
