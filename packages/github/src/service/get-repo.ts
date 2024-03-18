/* eslint-disable no-await-in-loop */
import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient, ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IRepo, formatRepoDataResponse, searchedDataFormator } from '../util/response-formatter';
import { getGitRepoSchema } from './validations';

const esClient = ElasticSearchClientGh.getInstance();
async function fetchReposData(
  repoIds: string[],
  esClient: ElasticSearchClientGh,
  gitRepoName: string,
  page: number,
  size: number
): Promise<IRepo[]> {
  let esbQuery;

  if (repoIds.length > 0) {
    const repoNameQuery = esb
      .requestBodySearch()
      .query(esb.boolQuery().must(esb.termsQuery('body.id', repoIds)))
      .toJSON() as { query: object };
    esbQuery = repoNameQuery.query;
  } else {
    const query = esb.boolQuery();

    if (gitRepoName) {
      query.must(esb.wildcardQuery('body.name', `*${gitRepoName.toLowerCase()}*`));
    }
    const finalQ = esb.requestBodySearch().query(query).toJSON() as { query: object };
    esbQuery = finalQ.query;
  }
  const data = await esClient.searchWithEsb(
    Github.Enums.IndexName.GitRepo,
    esbQuery,
    (page - 1) * size,
    size
  );

  return searchedDataFormator(data);
}

const gitRepos = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const gitRepoName: string = event?.queryStringParameters?.search ?? '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
  const page = Number(event?.queryStringParameters?.page ?? 1);
  const size = Number(event?.queryStringParameters?.size ?? 10);
  let response: IRepo[] = [];
  try {
    response = await fetchReposData(repoIds, esClient, gitRepoName, page, size);

    logger.info({ level: 'info', message: 'github repo data', data: response });
  } catch (error) {
    logger.error('GET_GITHUB_REPO_DETAILS', { error });
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
