import { APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { ghRequest } from '../lib/request-default';
import { getOauthCode } from '../util/jwt-token';
import { getOctokitTimeoutReqFn } from '../util/octokit-timeout-fn';

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
      const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);
      const installation = await octokitRequestWithTimeout('GET /app/installations');

      logger.info({
        message: 'getGitAppInstallations.info: Get list of all installations of github app',
      });

      return responseParser
        .setBody(installation.data)
        .setMessage('get metadata')
        .setStatusCode(HttpStatusCode[200])
        .setResponseBodyCode('SUCCESS')
        .send();
    } catch (error: unknown) {
      logger.error({ message: 'getGitAppInstallations.error', error });
      throw error;
    }
  };

export const handler = APIHandler(getGitAppInstallations);
