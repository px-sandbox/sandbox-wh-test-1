import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { fetchAndSaveOrganizationDetails } from 'src/lib/fetch-and-save-org-details';
import { getRepos } from 'src/lib/get-repos-list';
import { getUsers } from 'src/lib/get-user-list';
import { createAllIndices } from 'src/indices/indices';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';
import { ghRequest } from '../lib/request-defaults';

const getMetadata = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const organizationName: string = event?.queryStringParameters?.orgName || '';
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });

  logger.info('getAllMetadata.invoked', { organizationName });
  await createAllIndices();
  logger.info('AllIndices.created');
  const organization = await fetchAndSaveOrganizationDetails(octokit, organizationName);
  const [users, repo] = await Promise.all([
    getUsers(octokit, organizationName),
    getRepos(octokit, organizationName),
  ]);

  return responseParser
    .setBody({ organization, users, repo })
    .setMessage('get metadata')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

const handler = getMetadata;
// Todo: Middy validation timeout
//   APIHandler(getMetadata, {
//   eventSchema: transpileSchema(getMetadataSchema),
// });

export { getMetadata, handler };
