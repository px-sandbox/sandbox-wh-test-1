import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { formatRepoDataResponse, searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { getGitRepoSchema } from './validations';

const gitRepos = async function getRepoData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const gitRepoName: string = event?.queryStringParameters?.search || '';
  let response;
  try {
    const esClient = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    let data = (await esClient.getClient().search({ index: Github.Enums.IndexName.GitRepo })).body;
    if (gitRepoName) {
      data = await esClient.search(Github.Enums.IndexName.GitRepo, 'name', gitRepoName);
    }
    response = await searchedDataFormator(data);
    logger.info({ level: 'info', message: 'github repo data', data: response });
  } catch (error) {
    logger.error('GET_GITHUB_REPO_DETAILS', { error });
  }
  let body = null;
  let statusCode = HttpStatusCode[404];
  if (response) {
    body = formatRepoDataResponse(response);
    statusCode = HttpStatusCode[200];
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
