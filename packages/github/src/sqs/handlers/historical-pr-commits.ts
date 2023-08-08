import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPRCommitData(event: SQSEvent): Promise<any> {
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
    logger.info(`PR_NUMBER: ${messageBody.number}`, `REPO_NAME: ${messageBody.head.repo.name}`);
    await getPRCommits(messageBody, perPage, page, octokit);
  }
};
async function getPRCommits(
  messageBody: any,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const commentsDataOnPr = await octokit(
    `GET /repos/${messageBody.head.repo.owner.login}/${messageBody.head.repo.name}/pulls/${messageBody.number}/commits?per_page=${perPage}&page=${page}`
  );
  commentsDataOnPr.data.map(async (commitData: any) => {
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
          id: messageBody.head.repo.owner.id,
          name: messageBody.head.repo.name,
          owner: messageBody.head.repo.owner.login,
        },
        timestamp: new Date(),
      },
      Queue.gh_commit_format.queueUrl
    );
  });

  if (commentsDataOnPr.data.length < perPage) {
    logger.info('LAST_100_RECORD_PR_REVIEW');
    return;
  } else {
    page++;
    await getPRCommits(messageBody, perPage, page, octokit);
  }
}
// const prResponseData = await octokit(
//   `GET /repos/${messageBody.head.repo.owner.login}/${messageBody.head.repo.name}/pulls/${messageBody.number}`
// );
// console.log(prResponseData.data.number, prResponseData.data.head.repo.name, i);

// await new SQSClient().sendMessage(prResponseData, Queue.gh_historical_reviews.queueUrl);

// const mergeCommitSha = prResponseData.data.head.sha;

// const commitDataOnPr = await octokit(
//   `GET /repos/${numberPr.head.repo.owner.login}/${numberPr.head.repo.name}/pulls/${numberPr.number}/commits`
// );

// commitDataOnPr.data.map(async (commitData: any) => {
//   commitData.isMergedCommit = false;
//   commitData.mergedBranch = prResponseData.data.base.ref;
//   commitData.pushedBranch = prResponseData.data.head.ref;
//   if (commitData.sha === mergeCommitSha) {
//     commitData.isMergedCommit = prResponseData.data.merged;
//   }
//   await new SQSClient().sendMessage(
//     {
//       commitId: commitData.sha,
//       isMergedCommit: commitData.isMergedCommit,
//       mergedBranch: commitData.mergedBranch,
//       pushedBranch: commitData.pushedBranch,
//       repository: {
//         id: prResponseData.data.head.repo.id,
//         name: numberPr.head.repo.name,
//         owner: numberPr.head.repo.owner.login,
//       },
//       timestamp: new Date(),
//     },
//     Queue.gh_commit_format.queueUrl
//   );
// });

// check for pull request is merge or closed
// commit sha for that PR
// commit wali api call single data
// we always get the head and base branch toh hamesh key will go for mergedBranch, pushedBranch
// timestamp create on runtime default(+5:30)
// check for PR is merge or closed and merge_commit_sha is equal to that commit id, then set isMergeCommit= true
