import { Other } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { ghRequest } from '../lib/request-default';
import { getOauthCode } from './jwt-token';
import { getOctokitTimeoutReqFn } from './octokit-timeout-fn';

export async function getInstallationAccessToken(): Promise<Other.Type.LambdaResponse> {
  const {
    body: { token },
  } = await getOauthCode();

  const octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const octokitRequestWithTimeout = await getOctokitTimeoutReqFn(octokit);

  try {
    const installationAccessToken = await octokitRequestWithTimeout(
      'POST /app/installations/{installation_id}/access_tokens',
      {
        installation_id: Number(Config.GITHUB_SG_INSTALLATION_ID), // 34779793
      }
    );

    logger.info('Get installation access token');
    return {
      statusCode: 200,
      body: installationAccessToken.data,
    };
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
