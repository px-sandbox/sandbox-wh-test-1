import { Other } from 'abstraction';
import { logger } from 'core';
import { getRepos } from '../lib/get-repo-list';
import { getUsers } from '../lib/get-user-list';
import { ghRequest } from '../lib/request-default';
import { getInstallationAccessToken } from '../util/installation-access-token';

const collectData = async (orgName: string, reqCtx: Other.Type.RequestCtx): Promise<void> => {
  const { requestId, resourceId } = reqCtx;
  try {
    const installationAccessToken = await getInstallationAccessToken(orgName);
    const octokit = ghRequest.request.defaults({
      headers: {
        Authorization: `Bearer ${installationAccessToken.body.token}`,
      },
    });
    await Promise.all([
      getUsers(octokit, resourceId, orgName, requestId),
      getRepos(octokit, orgName, requestId),
    ]);
  } catch (error) {
    logger.error({
      message: 'collectData.error: HISTORY_DATA_ERROR',
      error: `${error}`,
      requestId,
    });
  }
};

const handler = collectData;
export { collectData, handler };
