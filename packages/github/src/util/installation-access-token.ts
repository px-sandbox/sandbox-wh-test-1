import { Other } from 'abstraction';
import { logger } from 'core';
import { ghRequest } from '../lib/request-default';
import { getOauthCode } from './jwt-token';
import { getOctokitTimeoutReqFn } from './octokit-timeout-fn';
import { getOrganizationByName } from 'src/lib/get-organization';

export async function getInstallationAccessToken(
  orgName: string
): Promise<Other.Type.LambdaResponse> {
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
    const { installationId } = await getOrganizationByName(orgName);
    const installationAccessToken = await octokitRequestWithTimeout(
      'POST /app/installations/{installation_id}/access_tokens',
      {
        installation_id: Number(installationId),
      }
    );

    logger.info({ message: 'Get installation access token' });
    return {
      statusCode: 200,
      body: installationAccessToken.data,
    };
  } catch (error: unknown) {
    logger.error({ message: 'Get installation access token error', error });
    throw error;
  }
}
