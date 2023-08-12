import { RequestInterface } from '@octokit/types';
import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
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
      const messageBody = JSON.parse(record.body);

      await getRepoCommits(
        messageBody.owner,
        messageBody.name,
        messageBody.githubRepoId,
        messageBody.branchName,
        perPage,
        page,
        octokit
      );
    })
  );
};
async function getRepoCommits(
  owner: string,
  name: string,
  githubRepoId: string,
  branchName: string,
  perPage: number,
  page: number,
  octokit: RequestInterface<{
    headers: {
      Authorization: string;
    };
  }>
) {
  try {
    const last_one_year_date = moment('2022-01-01', 'YYYY-MM-DD').toISOString();
    const commitDataOnPr = await octokit(
      `GET /repos/${owner}/${name}/commits?sha=${branchName}&per_page=${perPage}&page=${page}&sort=created&direction=asc&since=${last_one_year_date}`
    );
    let queueProcessed = [];
    queueProcessed = commitDataOnPr.data.map((commitData: any) =>
      // const commitId = `${mappingPrefixes.commit}_${commitData.sha}`;
      // const records = await new DynamoDbDocClient().find(
      //   new ParamsMapping().prepareGetParams(commitId)
      // );
      // if (records) {
      //   logger.info('DYNAMO_DB_DATA_FOUND', records);
      //   return;
      // }
      // commitData.isMergedCommit = false;
      // commitData.mergedBranch = null;
      // commitData.pushedBranch = null;
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

    if (commitDataOnPr.data.length < perPage) {
      logger.info('LAST_100_RECORD_PR');
      return;
    } else {
      page++;
      await getRepoCommits(owner, name, githubRepoId, branchName, perPage, page, octokit);
    }
  } catch (error) {
    logger.error(JSON.stringify({ message: 'historical.commits.error', error }));
  }
}
