import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { searchedDataFormator } from 'src/util/response-formatter';
import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { getGitUserSchema } from './validations';
import { OPENSEARCH_NODE, OPENSEARCH_PASSWORD, OPENSEARCH_USERNAME } from 'src/constant/config';

const githubUser = async function getUserData(event: APIGatewayProxyEvent): Promise<any> {
  const githubUserId: string = event?.pathParameters?.githubUserId || '';
  const data = await new ElasticSearchClient({
    host: OPENSEARCH_NODE,
    username: OPENSEARCH_USERNAME ?? '',
    password: OPENSEARCH_PASSWORD ?? '',
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
