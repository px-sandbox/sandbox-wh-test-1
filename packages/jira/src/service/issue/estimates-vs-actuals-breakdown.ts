import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { responseParser, HttpStatusCode } from 'core';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { estimatesVsActualsBreakdown } from '../../matrics/estimates-vs-actuals-breakdown';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = new ElasticSearchClient({
  host: Config.OPENSEARCH_NODE,
  username: Config.OPENSEARCH_USERNAME ?? '',
  password: Config.OPENSEARCH_PASSWORD ?? '',
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const projectId = event?.pathParameters?.projectId;
  const sprintId = event?.pathParameters?.sprintId;
  const page = parseInt(event?.queryStringParameters?.page ?? '1', 10);
  const limit = parseInt(event?.queryStringParameters?.limit ?? '10', 10);
  const sortKey = event?.queryStringParameters?.sortKey ?? 'estimate';
  const SortOrder = event?.queryStringParameters?.sortOrder ?? 'asc';
  const organization = event?.queryStringParameters?.organization ?? '';
  const orgIdQuery = esb
    .requestBodySearch()
    .query(esb.boolQuery().must(esb.termQuery('body.name', organization)))
    .source(['body.id']);
  const orgIdRes = await searchedDataFormator(
    await esClientObj.esbRequestBodySearch(Jira.Enums.IndexName.Organization, orgIdQuery.toJSON())
  );

  if (!projectId || !sprintId || !orgIdRes[0]) {
    throw new Error(
      'estimates-VS-actuals-breakdown: projectId, sprintId and organization are required'
    );
  }
  const response = await estimatesVsActualsBreakdown(
    projectId,
    sprintId,
    page,
    limit,
    sortKey,
    SortOrder,
    orgIdRes[0].id,
    organization
  );
  return responseParser
    .setBody(response)
    .setMessage('successfully fetched estimates vs actuals breakdown view')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};
