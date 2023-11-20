import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import esb from 'elastic-builder';
import { IRepo, formatRepoDataResponse, searchedDataFormator } from '../util/response-formatter';
import { getGitRepoSchema } from './validations';

async function processEventData(repoIds: string[], esClient: ElasticSearchClient,
  gitRepoName: string, page: number, size: number): Promise<Record<string, any>> {
  let data = null;
  if (repoIds.length > 0) {
    const repoName = esb.requestBodySearch().query(
      esb
        .boolQuery()
        .must(esb.termsQuery('body.id', repoIds))
    ).toJSON() as { query: object };
    data = await esClient.searchWithEsb(Github.Enums.IndexName.GitRepo, repoName.query);
  } else {
    data = (
      await esClient.getClient().search({
        index: Github.Enums.IndexName.GitRepo,
        from: (page - 1) * size,
        size,
      })
    ).body;
    if (gitRepoName) {
      data = await esClient.search(Github.Enums.IndexName.GitRepo, 'name', gitRepoName);
    }
  }

  return data;
}
const gitRepos = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const gitRepoName: string = event?.queryStringParameters?.search || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  const page = Number(event?.queryStringParameters?.page || 1);
  const size = Number(event?.queryStringParameters?.size || 10);
  let response: IRepo[] = [];
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const data = await processEventData(repoIds, esClient, gitRepoName, page, size);
    response = await searchedDataFormator(data);
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
