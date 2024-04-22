import { SQSClient } from '@pulse/event-handler';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { OctokitResponse } from '@octokit/types';
import { ghRequest } from '../../../lib/request-default';
import { getInstallationAccessToken } from '../../../util/installation-access-token';
import { getOctokitResp } from '../../../util/octokit-response';
import { getOctokitTimeoutReqFn } from '../../../util/octokit-timeout-fn';
import { logProcessToRetry } from 'rp';

const installationAccessToken = await getInstallationAccessToken();
const sqsClient = SQSClient.getInstance();

const octokit = ghRequest.request.defaults({
  headers: {
    Authorization: `Bearer ${installationAccessToken.body.token}`,
  },
});
const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
async function getRepoBranches(record: SQSRecord | { body: string }): Promise<boolean | undefined> {
  const messageBody = JSON.parse(record.body);
  const { owner, name, page = 1, githubRepoId } = messageBody;
  try {
    let branches = [];
    if (messageBody.reqBranch) {
      branches.push(messageBody.reqBranch);
    } else {
      const githubBranches = (await octokitRequestWithTimeout(
        `GET /repos/${owner}/${name}/branches?per_page=100&page=${page}`
      )) as OctokitResponse<any>;
      const octokitRespData = getOctokitResp(githubBranches);
      logger.info('GET_API_BRANCH_DATA', octokitRespData);
      const branchNameRegx = /\b(^dev)\w*[\/0-9a-zA-Z]*\w*\b/; // eslint-disable-line no-useless-escape
      branches = octokitRespData
        .filter((branchName: { name: string }) => branchNameRegx.test(branchName.name))
        .map((branch: { name: string }) => branch.name);
    }
    logger.info(`Processing data for repo: ${branches}`);
    const queueProcessed = branches.map((branch: { name: string }) =>
      sqsClient.sendMessage(
        {
          branchName: branch,
          owner,
          name,
          githubRepoId,
          page: 1,
        },
        Queue.qGhHistoricalCommits.queueUrl
      )
    );
    await Promise.all(queueProcessed);
    if (branches.length < 100) {
      logger.info('LAST_100_RECORD_PR');
      return true;
    }
    messageBody.page = page + 1;
    logger.info(`message_body_repo: ${messageBody}`);
    await getRepoBranches({ body: JSON.stringify(messageBody) });
  } catch (error) {
    logger.error(`historical.repoBranches.error: ${JSON.stringify(error)}`);
    await logProcessToRetry(
      record as SQSRecord,
      Queue.qGhHistoricalBranch.queueUrl,
      error as Error
    );
  }
}
export const handler = async function collectBranchData(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.filter((record: SQSRecord) => {
      const body = JSON.parse(record.body);
      if (body.owner && body.name) {
        logger.info(`BRANCH_MESSAGE_BODY_INSIDE_IF: ${body}`);
        return true;
      }
      logger.info(`
      HISTORICAL_BRANCH_MESSAGE_BODY: ${body}
      `);

      return false;
    }).map(async (record) => {
      try {
        await getRepoBranches(record);
      } catch (error) {
        await logProcessToRetry(record, Queue.qGhHistoricalBranch.queueUrl, error as Error);
        logger.error(JSON.stringify({ message: 'collectBranchData.failed', record, error }));
      }
    })
  );
};
