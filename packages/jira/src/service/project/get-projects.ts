import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import {
  formatProjectsResponse,
  searchedDataFormator,
} from '../../util/response-formatter';
import { getProjectsSchema } from '../validations';

/**
 * Retrieves Jira projects data from OpenSearch.
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 */
const projects = async function getProjectsData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const searchTerm: string = event?.queryStringParameters?.search?.toLowerCase() ?? '';
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);
  let response;
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    // match query if search term is present else get all projects
    let query;
    if (searchTerm) {
      // TODO: Update elastic search query using esb builder
      query = {
        bool: {
          must: [
            { match: { 'body.name': { query: searchTerm, fuzziness: 'AUTO' } } },
            { match: { 'body.isDeleted': false } },
          ],
        },
      };
    } else {
      query = {
        match: {
          'body.isDeleted': false,
        },
      };
    }

    // fetching data from elastic search based on query
    const { body: data } = await esClient.getClient().search({
      index: Jira.Enums.IndexName.Project,
      from: (page - 1) * size,
      size,
      body: {
        query,
      },
    });

    // formatting above query response data
    response = await searchedDataFormator(data);

    logger.info({ level: 'info', message: 'jira projects data', data: response });
  } catch (error) {
    logger.error('GET_JIRA_PROJECT_DETAILS', { error });
  }
  const { '200': ok, '404': notFound } = HttpStatusCode;
  const statusCode = response ? ok : notFound;
  const body = response ? formatProjectsResponse(response) : null;
  return responseParser
    .setBody(body)
    .setMessage('get jira projects details')
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(projects, {
  eventSchema: transpileSchema(getProjectsSchema),
});

export { projects, handler };
