import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { paginate } from '../../util/pagination';
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
  const searchTerm: string = event?.queryStringParameters?.search?.toLowerCase() ?? '';
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);

  let paginatedResp;
  try {
    // TODO: Keeping size 2000 for now. Maybe need to fetch all projects recursively in future
    let query = esb.requestBodySearch().size(2000);

    if (searchTerm) {
      query = query.query(
        esb
          .boolQuery()
          .must([esb.termQuery('body.isDeleted', false), esb.termQuery('body.name', searchTerm)])
      );
    } else {
      query = query.query(esb.termQuery('body.isDeleted', false));
    }

    // fetching data from elastic search based on query
    const data = await esClient.search(Jira.Enums.IndexName.Project, query.toJSON());

    // formatting above query response data
    const response = await searchedDataFormator(data);
    const sortedResp = _.sortBy(response, 'name');
    paginatedResp = await paginate(sortedResp, page, size);

    logger.info({ level: 'info', message: 'jira projects data', data: paginatedResp });
  } catch (error) {
    logger.error('GET_JIRA_PROJECT_DETAILS', { error });
  }
  const { '200': ok, '404': notFound } = HttpStatusCode;
  const statusCode = paginatedResp ? ok : notFound;
  const body = paginatedResp ? formatProjectsResponse(paginatedResp) : null;
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

export { handler, projects };
