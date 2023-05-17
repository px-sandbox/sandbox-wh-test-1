import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { transpileSchema } from '@middy/validator/transpile';
import { getMetadata } from './validations';
import { logger, APIHandler, HttpStatusCode, responseParser, createAllIndices } from 'core';
import { ghRequest } from '../lib/request-defaults';
import { getUsers } from 'src/lib/get-user-list';
import { getRepos } from 'src/lib/get-repos-list';
import { fetchAndSaveOrganizationDetails } from 'src/lib/fetch-and-save-org-details';

const GetMetadata = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const token: string = event.headers.authorization || '';
  const organizationName: string = event?.queryStringParameters?.orgName || '';

  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: token,
    },
  });
  logger.info('getAllMetadata.invoked', { organizationName });
  createAllIndices();
  logger.info('AllIndices.created');
  const organization = await fetchAndSaveOrganizationDetails(octokit, organizationName);
  const [users] = await Promise.all([
    getUsers(octokit, organizationName),
    getRepos(octokit, organizationName),
  ]);

  return responseParser
    .setBody({ organization, users })
    .setMessage('get metadata')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

const handler = APIHandler(GetMetadata, {
  eventSchema: transpileSchema(getMetadata),
});

export { GetMetadata, handler };
