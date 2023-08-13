import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { logProcessToRetry } from 'src/util/retry-process';
import { Queue } from 'sst/node/queue';

export const handler = async function collectBranchData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  let page = 1;
  const perPage = 100;
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
        const messageBody = JSON.parse(record.body);
        await getRepoBranches(
          messageBody.owner,
          messageBody.name,
          messageBody.githubRepoId,
          perPage,
          page,
          octokit
        );
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_historical_branch.queueUrl, error);
        logger.error(JSON.stringify({ message: 'collectBranchData.failed', record, error }));
      }
    })
  );
};
async function getRepoBranches(
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
    const branches = await octokit(
      `GET /repos/${owner}/${name}/branches?per_page=${perPage}&page=${page}`
    );
    logger.info('GET_API_BRANCH_DATA', branches);
    const branchNameRegx = /\b(^dev)\w*[\/0-9a-zA-Z]*\w*\b/;
    let queueProcessed = [];
    queueProcessed = branches.data
      .filter((branchName: any) => branchNameRegx.test(branchName.name))
      .map((branch: any) =>
        new SQSClient().sendMessage(
          {
            branchName: branch.name,
            owner: owner,
            name: name,
            githubRepoId: githubRepoId,
            page: 1,
          },
          Queue.gh_historical_commits.queueUrl
        )
      );
    await Promise.all(queueProcessed);

    if (queueProcessed.length < perPage) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      page++;
      await getRepoBranches(owner, name, githubRepoId, perPage, page, octokit);
    }
  } catch (error) {
    logger.error('historical.repoBranches.error', { error });
    throw error;
  }
}
