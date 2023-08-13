import { SQSClient } from '@pulse/event-handler';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import moment from 'moment';
import { ghRequest } from 'src/lib/request-defaults';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { logProcessToRetry } from 'src/util/retry-process';
import { getWorkingTime } from 'src/util/timezone-calculation';
import { Queue } from 'sst/node/queue';

export const handler = async function collectPrByNumberData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  await Promise.all(
    event.Records.map(async (record: any) => {
      const messageBody = JSON.parse(record.body);

      logger.info('HISTORY_PULL_REQUEST_DATA', { body: messageBody });
      try {
        const dataOnPr = await octokit(
          `GET /repos/${messageBody.owner}/${messageBody.repoName}/pulls/${messageBody.prNumber}`
        );
        // const createdTimezone = await getTimezoneOfUser(
        //   `${mappingPrefixes.user}_${dataOnPr.data.user.id}`
        // );
        if (moment(messageBody.approved_at).isBefore(moment(messageBody.submitted_at))) {
          messageBody.submittedAt = messageBody.approved_at;
        }
        const review_seconds = await getWorkingTime(
          moment(dataOnPr.data.created_at),
          moment(messageBody.submittedAt),
          '+5:30'
        );

        await new SQSClient().sendMessage(
          {
            ...dataOnPr.data,
            reviewed_at: messageBody.submittedAt,
            approved_at: messageBody.approvedAt,
            review_seconds: review_seconds,
          },
          Queue.gh_pr_format.queueUrl
        );

        // setting the `isMergedCommit` for commit
        if (dataOnPr.data.merged === true) {
          // const commitId = `${mappingPrefixes.commit}_${dataOnPr.data.merge_commit_sha}`;
          // const records = await new DynamoDbDocClient().find(
          //   new ParamsMapping().prepareGetParams(commitId)
          // );
          // console.log('DDB_RECORD', records);
          // if (records) {
          //   const commitQuery = esb.matchQuery('body.id', commitId).toJSON();
          //   const commits = await new ElasticSearchClient({
          //     host: Config.OPENSEARCH_NODE,
          //     username: Config.OPENSEARCH_USERNAME ?? '',
          //     password: Config.OPENSEARCH_PASSWORD ?? '',
          //   }).searchWithEsb(Github.Enums.IndexName.GitCommits, commitQuery);
          //   const [commitsData] = await searchedDataFormator(commits);
          //   console.log('COMMIT_SHSH', commitsData);
          //   if (commitsData) {
          await new SQSClient().sendMessage(
            {
              commitId: dataOnPr.data.merge_commit_sha,
              isMergedCommit: dataOnPr.data.merged,
              mergedBranch: null,
              pushedBranch: dataOnPr.data.head.ref,
              repository: {
                id: messageBody.repoId,
                name: messageBody.repoName,
                owner: messageBody.owner,
              },
              timestamp: new Date(),
            },
            Queue.gh_commit_format.queueUrl,
            dataOnPr.data.merge_commit_sha
          );
        }
      } catch (error) {
        await logProcessToRetry(record, Queue.gh_historical_pr_by_number.queueUrl, error);
        logger.error('historical.pr.number.error', { error });
      }
    })
  );
};
