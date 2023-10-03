import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import {
  IProject,
  formatProjectsResponse,
  searchedDataFormator,
} from '../../util/response-formatter';
import { getProjectsSchema } from '../validations';

/**
 * Retrieves Jira projects data from OpenSearch.
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 */
const projects = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const searchTerm: string = event?.queryStringParameters?.search ?? '';
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);
  let response: IProject[] = [];
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const data = (
      await esClient.getClient().search({
        index: Jira.Enums.IndexName.Project,
        from: (page - 1) * size,
        size: size * page - (page - 1) * size,
      })
    ).body;

    if (searchTerm) {
      const searchData = await esClient.search(Jira.Enums.IndexName.Project, 'name', searchTerm);
      response = await searchedDataFormator(searchData);
    } else {
      response = await searchedDataFormator(data);
    }
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
