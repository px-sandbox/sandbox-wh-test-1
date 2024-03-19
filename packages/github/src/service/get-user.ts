import { transpileSchema } from '@middy/validator/transpile';
import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import {
  IformatUserDataResponse,
  formatUserDataResponse,
  searchedDataFormator,
} from '../util/response-formatter';
import { getGitUserSchema } from './validations';
import esb from 'elastic-builder';

const esClient = ElasticSearchClientGh.getInstance();

const getGitUser = async (githubUserId: string): Promise<IformatUserDataResponse[]> => {
  const query = esb.matchQuery('body.id', githubUserId).toJSON();
  const data = await esClient.search(Github.Enums.IndexName.GitUsers, query);
  const response = await searchedDataFormator(data);
  return  response;
};
const githubUser = async function getUserData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const githubUserId: string = event?.pathParameters?.githubUserId || '';
   let response: IformatUserDataResponse[] = [];
  try {
    response = await getGitUser(githubUserId);
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
