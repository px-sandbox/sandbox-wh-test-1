import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { pROnQueue } from 'src/lib/send-pull-to-queue';
import { CommitProcessor } from 'src/processors/commit';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { Queue } from 'sst/node/queue';

export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  let i = 0;
  const record = event.Records[0];
  const messageBody = JSON.parse(record.body);

  for (const numberPr of messageBody) {
    const prResponseData = await octokit(
      `GET /repos/${numberPr.head.repo.owner.login}/${numberPr.head.repo.name}/pulls/${numberPr.number}`
    );
    const mergeCommitSha = prResponseData.data.head.sha;

    const commitDataOnPr = await octokit(
      `GET /repos/${numberPr.head.repo.owner.login}/${numberPr.head.repo.name}/pulls/${numberPr.number}/commits`
    );

    commitDataOnPr.data.map(async (commitData: any) => {
      commitData.isMergedCommit = false;
      commitData.mergedBranch = prResponseData.data.base.ref;
      commitData.pushedBranch = prResponseData.data.head.ref;
      if (commitData.sha === mergeCommitSha) {
        commitData.isMergedCommit = prResponseData.data.merged;
      }
      await new SQSClient().sendMessage(
        {
          commitId: commitData.sha,
          isMergedCommit: commitData.isMergedCommit,
          mergedBranch: commitData.mergedBranch,
          pushedBranch: commitData.pushedBranch,
          repository: {
            id: prResponseData.data.head.repo.id,
            name: numberPr.head.repo.name,
            owner: numberPr.head.repo.owner.login,
          },
          timestamp: new Date(),
        },
        Queue.gh_commit_format.queueUrl
      );
    });

    const commentsDataOnPr = await octokit(
      `GET /repos/${numberPr.head.repo.owner.login}/${numberPr.head.repo.name}/pulls/${numberPr.number}/comments`
    );
    commentsDataOnPr.data.map(async (comments: any) => {
      await new SQSClient().sendMessage(
        {
          comment: comments,
          pullId: prResponseData.data.id,
          repoId: prResponseData.data.head.repo.id,
        },
        Queue.gh_pr_review_comment_format.queueUrl
      );
    });
  }

  // check for pull request is merge or closed
  // commit sha for that PR
  // commit wali api call single data
  // we always get the head and base branch toh hamesh key will go for mergedBranch, pushedBranch
  // timestamp create on runtime default(+5:30)
  // check for PR is merge or closed and merge_commit_sha is equal to that commit id, then set isMergeCommit= true
};
