import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../../constant/config';

const esClientObj = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function deletePrevDependencies(repoId: string): Promise<void> {
  const matchQry = esb
    .requestBodySearch()
    .query(esb.matchQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`))
    .toJSON();

  await esClientObj.deleteByQuery(Github.Enums.IndexName.GitRepoLibrary, matchQry);
}
export async function repoLibHelper(
  data: Github.ExternalType.RepoLibrary,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  logger.info({ message: 'repoLibrary.handler', data, ...reqCtx });

  if (data) {
    const {
      coreDependencies,
      repositoryInfo: { repoId, repoOwner: orgName },
      dependencies,
    } = data;

    const uniqueDeps = dependencies.filter(
      (dep, index, self) =>
        index ===
        self.findIndex(
          (t) => t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
        )
    );
    await deletePrevDependencies(repoId);
    await Promise.all([
      ...uniqueDeps.map(async (dep) => {
        const message = {
          ...dep,
          repoId,
          orgName,
          isDeleted: false,
          isCore: false,
        };

        return sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl, { ...reqCtx });
      }),
      ...coreDependencies.map(async (dep) => {
        const message = {
          ...dep,
          repoId,
          orgName,
          isDeleted: false,
          isCore: true,
        };

        return sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl, { ...reqCtx });
      }),
    ]);
  }
}
