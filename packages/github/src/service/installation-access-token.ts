import { APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { getInstallationAccessToken } from '../util/installation-access-token';

export async function getGithubAccessToken(): Promise<APIGatewayProxyResult> {
  try {
    const installationAccessToken = await getInstallationAccessToken();

    logger.info({ message: 'Get installation access token' });
    return responseParser
      .setBody(installationAccessToken)
      .setMessage('get metadata')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error: unknown) {
    logger.error({ message: 'getGithubAccessToken.error', error });
    throw error;
  }
}
export const handler = APIHandler(getGithubAccessToken);
