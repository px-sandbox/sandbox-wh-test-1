/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IOrganisation } from 'abstraction/github/type';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { formatOrgDataResponse, searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

async function fetchOrganisations(requestId: string): Promise<IOrganisation[]> {
  const esbQuery = esb
    .requestBodySearch()
    .query(esb.boolQuery().should(esb.termQuery('body.isDeleted', false)))
    .toJSON();
  logger.info({ message: 'esbQuery', data: JSON.stringify(esbQuery), requestId });
  const data = await esClient.search(Github.Enums.IndexName.GitOrganization, esbQuery);

  return searchedDataFormator(data);
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  let response: IOrganisation[] = [];
  try {
    response = await fetchOrganisations(requestId);

    logger.info({ message: 'fetchOrganisations.info: github org data', data: response, requestId });
  } catch (error) {
    logger.error({ message: 'fetchOrganisations.error: GET_GITHUB_ORG_DETAILS', error, requestId });
  }
  let body = null;
  const { '200': ok, '404': notFound } = HttpStatusCode;
  let statusCode = notFound;
  if (response) {
    body = formatOrgDataResponse(response);
    statusCode = ok;
  }
  return responseParser
    .setBody(body)
    .setMessage('get github organisation list')
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};
