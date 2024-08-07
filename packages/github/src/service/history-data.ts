import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getRepos } from 'src/lib/get-repo-list';
import { getUsers } from 'src/lib/get-user-list';
import { ghRequest } from 'src/lib/request-default';
import { getInstallationAccessToken } from 'src/util/installation-access-token';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

const getRepo = async (repo: string): Promise<any> => {
  const query = esb.requestBodySearch().query(esb.matchQuery('body.name', repo)).toJSON();
  const data = await esClientObj.search(Github.Enums.IndexName.GitRepo, query);
  const [repoData] = await searchedDataFormator(data);
  return repoData;
};
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
      getUsers(octokit, orgName, requestId),
      getRepos(octokit, orgName, requestId),
    ]);
    const repoData = await getRepo(orgName);
    logger.info({
      message: 'collectData.info: github repo data',
      data: JSON.stringify(repoData),
      requestId,
      resourceId,
    });
    if (repoData === undefined || repoData.length < 0) {
      logger.error({ message: 'collectData.error: REPO_NOT_FOUND', requestId });
      return;
    }
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
