import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import esb from 'elastic-builder';
import { estimatesVsActualsBreakdownV2 } from '../../matrics/estimates-vs-actuals-breakdown-v2';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Handles the API Gateway event for fetching estimates vs actuals breakdown view.
 * @param event - The API Gateway event.
 * @returns A promise that resolves to the API Gateway proxy result.
 * @throws Error if projectId, sprintId, or orgId is missing, or if the organization is not found.
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const projectId = event?.queryStringParameters?.projectId ?? '';
  const sprintId = event?.queryStringParameters?.sprintId ?? '';
  const versionId = event?.queryStringParameters?.versionId ?? '';
  const sortKey = event?.queryStringParameters?.sortKey ?? 'estimate';
  const SortOrder = event?.queryStringParameters?.sortOrder ?? 'asc';
  const orgId = event?.queryStringParameters?.orgId ?? '';
  const type = event?.queryStringParameters?.type ?? 'sprint';

  const orgnameQuery = esb
    .requestBodySearch()
    .query(esb.boolQuery().must(esb.termQuery('body.id', orgId)))
    .source(['body.name']);
  const orgnameRes = await searchedDataFormator(
    await esClientObj.search(Jira.Enums.IndexName.Organization, orgnameQuery.toJSON())
  );

  if ((!projectId || !orgId) && (!sprintId || !versionId)) {
    throw new Error(
      'estimates-VS-actuals-breakdown: projectId, sprintId, versionId and organization are required!'
    );
  }

  if (!orgnameRes[0]?.name) {
    throw new Error('estimates-VS-actuals-breakdown: organization not found!');
  }

  const response = await estimatesVsActualsBreakdownV2(
    projectId,
    sortKey,
    SortOrder,
    orgId,
    orgnameRes[0].name,
    type,
    type === Jira.Enums.JiraFilterType.SPRINT ? sprintId : versionId
  );

  return responseParser
    .setBody(response)
    .setMessage('successfully fetched estimates vs actuals breakdown view')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};
