/* eslint-disable no-await-in-loop */
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Jira, Other } from 'abstraction';
import moment from 'moment';
import { searchedDataFormator } from '../util/response-formatter';
import { getOrganization } from '../repository/organization/get-organization';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Fetches reopen rate data for the specified project, issue keys, and organization.
 * Updates the isDeleted and deletedAt properties of the fetched data.
 * @param projectId The ID of the project.
 * @param issueKeys An array of issue keys.
 * @param orgId The ID of the organization.
 * @returns A Promise that resolves when the update is complete.
 */
async function fetchReopenRateData(
  projectId: string,
  issueKeys: string[],
  orgId: string
): Promise<void> {
  try {
    const updateReopenRateDataQuery = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.issueKey.keyword', issueKeys),
            esb.termQuery('body.projectId', projectId),
            esb.termQuery('body.organizationId', orgId),
            esb.termQuery('body.isDeleted', false),
          ])
      )
      .toJSON();

    const script = esb
      .script()
      .source(
        'ctx._source.body.isDeleted=params.isDeleted;ctx._source.body.deletedAt=params.deletedAt'
      )
      .params({
        deletedAt: moment().toISOString(),
        isDeleted: true,
      })
      .toJSON();

    await esClientObj.updateByQuery(
      Jira.Enums.IndexName.ReopenRate,
      updateReopenRateDataQuery,
      script
    );
  } catch (error) {
    logger.error(`issue-delete-reopen-rate.error: ${error}`);
    throw error;
  }
  logger.info('issue-delete-reopen-rate-migration:success');
}
/**
 * Handles the issue delete reopen rate migration.
 *
 * @param event - The API Gateway proxy event.
 * @returns A Promise that resolves to void.
 * @throws Error if projectId is not provided or if the organization is not found.
 */
export const handler = async function issueDeleteReopenRateMigration(
  event: APIGatewayProxyEvent
): Promise<void> {
  const projectId = event?.queryStringParameters?.projectId;
  if (!projectId) {
    throw new Error('projectId is required');
  }
  const organization = event?.queryStringParameters?.organization ?? '';
  const orgData = await getOrganization(organization);

  if (!orgData) {
    logger.error(`Organization ${organization} not found`);
    throw new Error(`Organization ${organization} not found`);
  }

  try {
    const issueQuery = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termQuery('body.organizationId.keyword', `${orgData.id}`),
            esb.termQuery('body.projectId', `${projectId}`),
            esb.termQuery('body.isDeleted', true),
          ])
      )
      .source(['body.issueKey'])
      .size(1000)
      .sort(esb.sort('_id'));

    let unformattedIssueData: Other.Type.HitBody = await esClientObj.search(
      Jira.Enums.IndexName.Issue,
      issueQuery.toJSON()
    );
    const issueData = [];
    let formattedIssueData = await searchedDataFormator(unformattedIssueData);
    issueData.push(...formattedIssueData);

    while (formattedIssueData?.length > 0) {
      const lastHit = unformattedIssueData.hits.hits[unformattedIssueData.hits.hits.length - 1];
      const requestBodyQuery = issueQuery.searchAfter([lastHit.sort[0]]).toJSON();
      unformattedIssueData = await searchedDataFormator(
        await esClientObj.search(Jira.Enums.IndexName.Issue, requestBodyQuery)
      );
      formattedIssueData = await searchedDataFormator(unformattedIssueData);
      issueData.push(...formattedIssueData);
    }

    const issueKeys = [...new Set(issueData.map((issue) => issue.issueKey))];
    logger.info(`issue-delete-reopen-rate: issueKeys: ${issueKeys}`);
    await fetchReopenRateData(projectId, issueKeys, `${orgData.id}`);
  } catch (error) {
    logger.error(`issue-delete-reopen-rate.error:  ${error}`);
    throw error;
  }
};
