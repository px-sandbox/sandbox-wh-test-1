import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { Config } from 'sst/node/config';
import {
  IformatUserDataResponse,
  formatUserDataResponse,
  searchedDataFormator,
} from '../util/response-formatter';
import { getGitUserSchema } from './validations';

const githubUser = async function getUserData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const githubUserId: string = event?.pathParameters?.githubUserId || '';
  let response: IformatUserDataResponse[] = [];
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const data = await esClient.search(
      Github.Enums.IndexName.GitUsers,
      Github.Enums.SearchKey.GitUserId,
      githubUserId
    );

    response = await searchedDataFormator(data);
    logger.info({ level: 'info', message: 'github user data', data: response });
  } catch (error) {
    logger.error('GET_GITHUB_USER_DETAILS', { error });
  }
  let body = null;
  const { '200': ok, '404': notFound } = HttpStatusCode;
  let statusCode = notFound;
  if (response[0]) {
    body = formatUserDataResponse(response[0]);
    statusCode = ok;
  }
  return responseParser
    .setBody(body)
    .setMessage('get github user details')
    .setStatusCode(statusCode)
    .setResponseBodyCode('SUCCESS')
    .send();
};
const handler = APIHandler(githubUser, {
  eventSchema: transpileSchema(getGitUserSchema),
});

export { githubUser, handler };
