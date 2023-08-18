import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getOctokitResp } from 'src/util/octokit-response';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function collectBranchData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name) {
        return true;
      }
      logger.info(`
      HISTORICAL_BRANCH_MESSAGE_BODY: ${body}
      `);

      return false;
    }).map(async (record: any) => {
      try {
        await getRepoBranches(record, octokit);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
        logger.error(JSON.stringify({ message: 'collectBranchData.failed', record, error }));
      }
    })
  );
};
async function getRepoBranches(
  record: any,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  const messageBody = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId } = messageBody;
  try {
    let branches = [];
    if (messageBody.reqBranch) {
      branches.push(messageBody.reqBranch);
    } else {
      const githubBranches = await octokit(
        `GET /repos/${owner}/${name}/branches?per_page=100&page=${page}`
      );
      const octokitRespData = getOctokitResp(githubBranches);
      logger.info('GET_API_BRANCH_DATA', octokitRespData);
      const branchNameRegx = /\b(^dev)\w*[\/0-9a-zA-Z]*\w*\b/;
      branches = octokitRespData
        .filter((branchName: any) => branchNameRegx.test(branchName.name))
        .map((branch: any) => branch.name);
    }
    const queueProcessed = branches.map((branch: any) =>
      new SQSClient().sendMessage(
        {
          branchName: branch,
          owner: owner,
          name: name,
          githubRepoId: githubRepoId,
          page: 1,
        },
        Queue.gh_historical_commits.queueUrl
      )
    );
    await Promise.all(queueProcessed);
    if (branches.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      messageBody.page = page + 1;
      await new SQSClient().sendMessage(messageBody, Queue.gh_historical_branch.queueUrl);
    }
  } catch (error) {
    await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
    logger.error('historical.repoBranches.error', { error });
  }
}
