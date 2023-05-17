import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { APIHandler, ElasticClient, HttpStatusCode, logger, responseParser } from 'core';
import { searchedDataFormator } from 'src/util/response-formatter';
import { getGitUserSchema } from './validations';
import { transpileSchema } from '@middy/validator/transpile';

const githubUser = async function getUserData(event: APIGatewayProxyEvent): Promise<any> {
  const githubUserId: string = event?.pathParameters?.githubUserId || '';

  const data = await ElasticClient.search(
    Github.Enums.IndexName.GitUsers,
    Github.Enums.SearchKey.GitUserId,
    githubUserId
  );
  const response = await searchedDataFormator(data);
  logger.info({ level: 'info', message: 'github user data', data: response });

  return responseParser
    .setBody(response)
    .setMessage('get metadata')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(githubUser, {
  eventSchema: transpileSchema(getGitUserSchema),
});

export { githubUser, handler };
