import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';

export const handler = async function collectCommitData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);

    logger.info('ALL_PR_DATA_TO_GET_SINGLE_PR', { number: messageBody.number });
    // const responseData = await octokit(
    //   `GET /repos/${prNumber.head.repo.owner}/${prNumber.head.repo.name}/pulls/${prNumber.number}`
    // );
    // console.log('singlePR', responseData);
  }

  // check for pull request is merge or closed
  // commit sha for that PR
  // commit wali api call single data
  // we always get the head and base branch toh hamesh key will go for mergedBranch, pushedBranch
  // timestamp create on runtime default(+5:30)
  // check for PR is merge or closed and merge_commit_sha is equal to that commit id, then set isMergeCommit= true
};
