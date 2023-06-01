import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { getGitUserSchema } from './validations';

const githubUser = async function getUserData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const githubUserId: string = event?.pathParameters?.githubUserId || '';
  const data = await new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
  }).search(Github.Enums.IndexName.GitUsers, Github.Enums.SearchKey.GitUserId, githubUserId);
  const response = await searchedDataFormator(data);
  logger.info({ level: 'info', message: 'github user data', data: response });

  return responseParser
    .setBody(response)
    .setMessage('get github user details')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(githubUser, {
  eventSchema: transpileSchema(getGitUserSchema),
});

export { githubUser, handler };
