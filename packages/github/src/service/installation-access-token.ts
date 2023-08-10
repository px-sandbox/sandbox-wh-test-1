import { APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { getInstallationAccessToken } from 'src/util/installation-access-token-generator';

export async function getGithubAccessToken(): Promise<APIGatewayProxyResult> {
  try {
    const installationAccessToken = await getInstallationAccessToken();

    logger.info('Get installation access token');
    return responseParser
      .setBody(installationAccessToken)
      .setMessage('get metadata')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
export const handler = APIHandler(getGithubAccessToken);
