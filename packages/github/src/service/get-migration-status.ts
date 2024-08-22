import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import _ from 'lodash';

const esClient = ElasticSearchClient.getInstance();

const getMigrationStatus = async function getStatus(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const orgId = event.queryStringParameters?.orgId || '';
  try {
    const matchQry = esb
      .requestBodySearch()
      .query(esb.matchQuery('body.organizationId', orgId))
      .toJSON();
    const data = await esClient.search(Github.Enums.IndexName.GitMigrationStatus, matchQry);
    const [statusData] = await searchedDataFormator(data);
    const latestStatus = _.orderBy(statusData.statusLogs, ['date'], 'desc')[0];
    return responseParser
      .setBody(latestStatus)
      .setMessage('Migration Status fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    return responseParser
      .setBody(`${error}`)
      .setMessage('Error while getting migration status')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('FAILED')
      .send();
  }
};

export const handler = getMigrationStatus;
