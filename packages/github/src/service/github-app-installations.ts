import { APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { ghRequest } from 'src/lib/request-defaults';
import { getOauthCode } from 'src/util/jwt-token';

export const getGitAppInstallations =
  async function getGitAppInstallationList(): Promise<APIGatewayProxyResult> {
    const {
      body: { token },
    } = await getOauthCode();

    try {
      const octokit = ghRequest.request.defaults({
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      const installation = await octokit('GET /app/installations');

      logger.info('Get list of all installations of github app');

      return responseParser
        .setBody(installation.data)
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
  };

export const handler = APIHandler(getGitAppInstallations);
