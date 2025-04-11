import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { HitBody } from 'abstraction/other/type';
import { formatProjectsResponse, searchedDataFormator } from '../../util/response-formatter';
import { getProjectsSchema } from '../validations';

/**
 * Retrieves Jira projects data from OpenSearch.
 * @param event - The APIGatewayProxyEvent object.
 * @returns A Promise that resolves to an APIGatewayProxyResult object.
 */
const esClient = ElasticSearchClient.getInstance();
const projects = async function getProjectsData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const searchTerm: string = event?.queryStringParameters?.search?.toLowerCase() ?? '';
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);
  try {
    // TODO: Keeping size 2000 for now. Maybe need to fetch all projects recursively in future
    let query = esb
      .requestBodySearch()
      .from(size * (page - 1))
      .size(size)
      .query(esb.boolQuery().must(esb.termQuery('body.isDeleted', false)));

    if (searchTerm) {
      query = query.query(
        esb
          .boolQuery()
          .must([esb.termQuery('body.isDeleted', false), esb.termQuery('body.name', searchTerm)])
      );
    }
    // fetching data from elastic search based on query
    const data: HitBody = await esClient.search(Jira.Enums.IndexName.Project, query.toJSON());
    const totalPages = Math.ceil(data.hits.total.value / size);
    // formatting above query response data
    const result = await searchedDataFormator(data);
    const formattedResult = formatProjectsResponse(result);
    logger.info({ requestId, message: 'jira_projects_data', data: formattedResult });
    const body = { projectList: formattedResult, totalPages };
    return responseParser
      .setBody(body)
      .setMessage('get jira projects details')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({ requestId, message: 'GET_JIRA_PROJECT_DETAILS_ERROR', error });
    return responseParser
      .setBody({})
      .setMessage('get jira projects details')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('NOT_FOUND')
      .send();
  }
};
const handler = APIHandler(projects, {
  eventSchema: transpileSchema(getProjectsSchema),
});

export { handler, projects };
