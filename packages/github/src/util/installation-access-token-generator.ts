import { Other } from 'pulse-abstraction';
import { Config } from 'sst/node/config';
import { getOauthCode } from './jwt-token';
import { ghRequest } from 'src/lib/request-defaults';
import { logger } from 'core';

export async function getInstallationAccessToken(): Promise<Other.Type.LambdaResponse> {
  const {
    body: { token },
  } = await getOauthCode();

  let octokit = ghRequest.request.defaults({
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  try {
    const installationAccessToken = await octokit(
      'POST /app/installations/{installation_id}/access_tokens',
      {
        installation_id: Number(Config.GITHUB_SG_INSTALLATION_ID),
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
