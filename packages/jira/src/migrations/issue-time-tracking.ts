/* eslint-disable max-lines-per-function */
/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { SQSClient } from '@pulse/event-handler';
import { Queue } from 'sst/node/queue';
import { logger } from 'core';
import async from 'async';

import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function sendIssuesToMigrationQueue(
  projectId: string,
  organization: string,
  issues: (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[],
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    await async.eachLimit(issues, 50, async (issue) => {
      try {
        logger.info({
          requestId,
          resourceId,
          message: `issueTimeTrackingMigr: sending issue ${issue?.issueKey} to migration queue`,
        });
        await sqsClient.sendMessage(
          { issue, organization },
          Queue.qIssueTimeTrackingMigration.queueUrl,
          reqCtx
        );
      } catch (e) {
        logger.error({
          ...reqCtx,
          message: `Error in issue(time tracking) migration while sending issue to indexer loop: ${e}`,
        });
      }
    });
  } catch (e) {
    logger.error({
      ...reqCtx,
      message: `Error in issue(time tracking) migration while sending issue to indexer: ${e}`,
    });
  }
  logger.info({
    ...reqCtx,
    message: `Successfully sent all issues to migration queue for projectID: ${projectId}`,
  });
}

/**
 * Performs the migration for issue time tracking.
 *
 * @param projectId - The ID of the project.
 * @param organization - The organization name.
 * @returns A Promise that resolves when the migration is complete.
 */
async function migration(
  projectId: string,
  organization: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    logger.info({
      requestId,
      resourceId,
      message: `issue-time-tracking: 
        Fetching issues from elasticSearch in batches of 1000 for projectId: ${projectId}`,
    });
    const issues = [];
    const requestBodySearchquery = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.projectId', projectId),
            esb.termsQuery('body.issueType', ['Story', 'Task', 'Bug', 'Sub-task']),
          ])
          .should([
            esb.boolQuery().mustNot(esb.existsQuery('body.timeTracker')),
            esb.boolQuery().mustNot(esb.existsQuery('body.summary')),
          ])
          .minimumShouldMatch(1)
      )
      .size(1000)
      .sort(esb.sort('_id'));

    logger.info({
      requestId,
      resourceId,
      message: 'issue-time-tracking: requestBodySearchquery: ',
      data: { requestBodySearchquery },
    });

    let response: Other.Type.HitBody = await esClientObj.search(
      Jira.Enums.IndexName.Issue,
      requestBodySearchquery.toJSON()
    );
    logger.info({
      requestId,
      resourceId,
      message: 'issue-time-tracking: response: ',
      data: { response: response?.hits?.total },
    });
    let formattedResponse = await searchedDataFormator(response);

    issues.push(...formattedResponse);

    // fetching issues from ES using search_after concept because count of issues can be more than 10000
    while (formattedResponse?.length) {
      const lastHit = response?.hits?.hits[response.hits.hits.length - 1];

      const requestBodyQuery = requestBodySearchquery.searchAfter([lastHit?.sort[0]]).toJSON();

      response = await esClientObj.search(Jira.Enums.IndexName.Issue, requestBodyQuery);

      formattedResponse = await searchedDataFormator(response);
      issues.push(...formattedResponse);
    }
    logger.info({
      requestId,
      resourceId,
      message: `issue-time-tracking: num of issues fetched: ${issues?.length}`,
    });

    await sendIssuesToMigrationQueue(projectId, organization, issues, reqCtx);
  } catch (e) {
    logger.error({
      requestId,
      resourceId,
      message: `Error in issue(time tracking) migration: ${e}`,
    });
  }
}

/**
 * Handles the migration of issue time tracking.
 *
 * @param event - The API Gateway proxy event.
 * @returns A promise that resolves to void.
 */
export const handler = async function migrateIssueTimeTracking(
  event: APIGatewayProxyEvent
): Promise<void> {
  const { requestId } = event.requestContext;
  const projectId = event?.pathParameters?.projectId ?? '';
  const organization = event?.queryStringParameters?.organization ?? '';
  logger.info({
    requestId,
    resourceId: projectId,
    message: `issue-time-tracking-migration: projectId: ${projectId} organization: ${organization}`,
  });
  await migration(projectId, organization, { requestId, resourceId: projectId });
};
