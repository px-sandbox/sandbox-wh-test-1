import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { logProcessToRetry } from '../../../util/retry-process';

const installationAccessToken = await getInstallationAccessToken();
const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
export const handler = async function collectBranchData(event: SQSEvent): Promise<void> {
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
        await getRepoBranches(record);
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
        logger.error(JSON.stringify({ message: 'collectBranchData.failed', record, error }));
      }
    })
  );
};
async function getRepoBranches(record: any) {
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
    logger.info(`Proccessing data for repo: ${branches}`);
    const queueProcessed = branches.map((branch: any) =>
      new SQSClient().sendMessage(
        {
          branchName: branch,
          owner,
          name,
          githubRepoId,
          page: 1,
        },
        Queue.gh_historical_commits.queueUrl
      )
    );
    await Promise.all(queueProcessed);
    if (branches.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return true;
    } else {
      messageBody.page = page + 1;
      logger.info(`message_body_repo: ${messageBody}`);
      await getRepoBranches({ body: JSON.stringify(messageBody) });
    }
  } catch (error) {
    logger.error(`historical.repoBranches.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
  }
}
