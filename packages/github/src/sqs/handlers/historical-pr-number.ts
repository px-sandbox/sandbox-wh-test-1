import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { mappingPrefixes } from 'src/constant/config';
import { ghRequest } from 'src/lib/request-defaults';
import { ParamsMapping } from 'src/model/params-mapping';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { getWorkingTime } from 'src/util/timezone-calculation';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

export const handler = async function collectReviewsData(event: SQSEvent): Promise<void> {
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      Authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const record = event.Records[0];
  const messageBody = JSON.parse(record.body);
  logger.info('PULL_REQUEST_DATA', { body: messageBody });
  const dataOnPr = await octokit(
    `GET /repos/${messageBody.owner}/${messageBody.repoName}/pulls/${messageBody.prNumber}`
  );
  // const createdTimezone = await getTimezoneOfUser(
  //   `${mappingPrefixes.user}_${dataOnPr.data.user.id}`
  // );
  const review_seconds = await getWorkingTime(
    moment(dataOnPr.data.created_at),
    moment(messageBody.submittedAt),
    '+5:30'
  );

  new SQSClient().sendMessage(
    {
      ...dataOnPr.data,
      reviewed_at: messageBody.submittedAt,
      approved_at: messageBody.approvedAt,
      review_seconds: review_seconds,
      action: Github.Enums.Comments.REVIEW_COMMENTED,
    },
    Queue.gh_pr_format.queueUrl
  );
  const commitId = `${mappingPrefixes.commit}_${dataOnPr.data.merge_commit_sha}`;
  const records = await new DynamoDbDocClient().find(
    new ParamsMapping().prepareGetParams(commitId)
  );
  if (records) {
    const commitQuery = esb.requestBodySearch().query(esb.matchQuery('body.id', commitId)).toJSON();
    console.log('Commit_query', commitQuery);
    const commitData = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    }).searchWithEsb(Github.Enums.IndexName.GitCommits, commitQuery);
    console.log('FOUND_COMMIT_DATA', commitData);
    // update commit
  }
};
