import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';
import { fetchAndSaveOrganizationDetails } from '../lib/update-organization';
import { getRepos } from '../lib/get-repo-list';
import { getUsers } from '../lib/get-user-list';
import { createAllIndices } from '../indices/indices';
import { getInstallationAccessToken } from '../util/installation-access-token';
import { ghRequest } from '../lib/request-default';

const getMetadata = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const organizationName: string = event?.queryStringParameters?.orgName || '';
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

  logger.info('getAllMetadata.invoked', { organizationName });
  await createAllIndices();
  logger.info('AllIndices.created');
  const organization = await fetchAndSaveOrganizationDetails(
    octokitRequestWithTimeout,
    organizationName
  );
  const [users, repo] = await Promise.all([
    getUsers(octokitRequestWithTimeout, organizationName),
    getRepos(octokitRequestWithTimeout, organizationName),
  ]);

  return responseParser
    .setBody({ organization, users, repo })
    .setMessage('get metadata')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};

const handler = getMetadata;

export { getMetadata, handler };
