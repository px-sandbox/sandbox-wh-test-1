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
  const { requestId } = event.requestContext;
  const organizationName: string = event?.queryStringParameters?.orgName || '';
  const installationAccessToken = await getInstallationAccessToken();
  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${installationAccessToken.body.token}`,
    },
  });
  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

  logger.info({ message: 'getAllMetadata.invoked', data: organizationName, requestId });
  await createAllIndices();
  logger.info({ message: 'AllIndices.created', requestId });
  const organization = await fetchAndSaveOrganizationDetails(
    octokitRequestWithTimeout,
    organizationName,
    requestId
  );
  const [users, repo] = await Promise.all([
    getUsers(octokitRequestWithTimeout, organizationName, requestId),
    getRepos(octokitRequestWithTimeout, organizationName, requestId),
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
