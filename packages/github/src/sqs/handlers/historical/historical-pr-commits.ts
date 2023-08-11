import { RequestInterface } from '@octokit/types';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { mappingPrefixes } from 'src/constant/config';
import { ghRequest } from 'src/lib/request-defaults';
import { ParamsMapping } from 'src/model/params-mapping';
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
  await Promise.all(
    event.Records.filter((record: any) => {
      const body = JSON.parse(record.body);
      if (body.head && body.head.repo) {
        return true;
      }

      logger.info(`
      PR with no repo: ${body}
      `);

      return false;
    }).map(async (record: any) => {
      await getPRCommits(JSON.parse(record.body), perPage, page, octokit);
    })
  );
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
  try {
    if (!messageBody && !messageBody.head) {
      logger.info('HISTORY_MESSGE_BODY', messageBody);
      return;
    }
    const commentsDataOnPr = await octokit(
      `GET /repos/${messageBody.head.repo.owner.login}/${messageBody.head.repo.name}/pulls/${messageBody.number}/commits?per_page=${perPage}&page=${page}`
    );

    await Promise.all(commentsDataOnPr.data.map((commit: any) => saveCommit(commit, messageBody)));

    if (commentsDataOnPr.data.length < perPage) {
      logger.info('LAST_100_RECORD_PR_REVIEW');
      return;
    } else {
      page++;
      await getPRCommits(messageBody, perPage, page, octokit);
    }
  } catch (error) {
    logger.error('historical.PR.commits.error');
  }
}

async function saveCommit(commitData: any, messageBody: any) {
  // const commitId = `${mappingPrefixes.commit}_${commitData.sha}`;
  // const records = await new DynamoDbDocClient().find(
  //   new ParamsMapping().prepareGetParams(commitId)
  // );
  // if (records) {
  //   logger.info('DYNAMO_DB_DATA_FOUND', records);
  //   return;
  // }
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
}
