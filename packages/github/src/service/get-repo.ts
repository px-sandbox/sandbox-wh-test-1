/* eslint-disable no-await-in-loop */
import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IRepo, formatRepoDataResponse, searchedDataFormator } from '../util/response-formatter';
import { getGitRepoSchema } from './validations';

const esClient = ElasticSearchClient.getInstance();
async function fetchReposData(
  organisationId: string,
  repoIds: string[],
  gitRepoName: string,
  requestId: string,
  page: number,
  size: number
): Promise<IRepo[]> {
  let esbQuery;

  const orgQuery = esb.boolQuery().should(esb.termQuery('body.organisationId', organisationId));

  if (repoIds.length > 0) {
    const repoNameQuery = esb
      .requestBodySearch()
      .query(
        orgQuery
          .must([esb.termsQuery('body.id', repoIds), esb.termQuery('body.isDeleted', false)])
      )
      .toJSON();
    esbQuery = repoNameQuery;
  } else {
    
    if (gitRepoName) {
      orgQuery
        .must([
          esb.wildcardQuery('body.name', `*${gitRepoName.toLowerCase()}*`),
          esb.termQuery('body.isDeleted', false),
        ])
    }
    const finalQ = esb
      .requestBodySearch()
      .size(size)
      .from((page - 1) * size)
      .query(orgQuery)
      .toJSON() as { query: object };
    esbQuery = finalQ;
  }
  logger.info({ message: 'esbQuery', data: JSON.stringify(esbQuery), requestId });
  const data = await esClient.search(Github.Enums.IndexName.GitRepo, esbQuery);

  return searchedDataFormator(data);
}

const gitRepos = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  const gitRepoName: string = event?.queryStringParameters?.search ?? '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
  const organisationId: string = event?.queryStringParameters?.organisationId ?? '';
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);
  let response: IRepo[] = [];
  try {
    response = await fetchReposData(organisationId, repoIds, gitRepoName, requestId, page, size);

    logger.info({ message: 'fetchReposData.info: github repo data', data: response, requestId });
  } catch (error) {
    logger.error({ message: 'fetchReposData.error: GET_GITHUB_REPO_DETAILS', error, requestId });
  }
  let body = null;
  const { '200': ok, '404': notFound } = HttpStatusCode;
  let statusCode = notFound;
  if (response) {
    body = formatRepoDataResponse(response);
    statusCode = ok;
  }
  return responseParser
    .setBody(body)
    .setMessage('get github repo details')
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(gitRepos, {
  eventSchema: transpileSchema(getGitRepoSchema),
});

export { gitRepos, handler };
