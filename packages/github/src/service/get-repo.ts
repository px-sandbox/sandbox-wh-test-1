import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import { IRepo, formatRepoDataResponse, searchedDataFormator } from '../util/response-formatter';
import { getGitRepoSchema } from './validations';

const gitRepos = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const gitRepoName: string = event?.queryStringParameters?.search || '';
  const page = Number(event?.queryStringParameters?.page || 1);
  const size = Number(event?.queryStringParameters?.size || 10);
  let response: IRepo[] = [];
  try {
    const esClient = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    let data = (
      await esClient.getClient().search({
        index: Github.Enums.IndexName.GitRepo,
        from: (page - 1) * size,
        size: size * page - (page - 1) * size,
      })
    ).body;

    if (gitRepoName) {
      data = await esClient.search(Github.Enums.IndexName.GitRepo, 'name', gitRepoName);
    }
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
