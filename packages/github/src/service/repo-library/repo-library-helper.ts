import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { mappingPrefixes } from '../../constant/config';

const esClientObj = ElasticSearchClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();

async function deletePrevDependencies(repoId: string): Promise<void> {
  const matchQry = esb
    .requestBodySearch()
    .query(esb.matchQuery('body.repoId', `${mappingPrefixes.repo}_${repoId}`))
    .toJSON();
  const script = esb.script('inline', 'ctx._source.body.isDeleted = true');

  await esClientObj.updateByQuery(Github.Enums.IndexName.GitRepoLibrary, matchQry, script.toJSON());
}
export async function repoLibHelper(data: Github.ExternalType.RepoLibrary): Promise<void> {
  logger.info('repoLibrary.handler', { data });

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

        return sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
      }),
      ...coreDependencies.map(async (dep) => {
        const message = {
          ...dep,
          repoId,
          orgName,
          isDeleted: false,
          isCore: true,
        };

        return sqsClient.sendMessage(message, Queue.qDepRegistry.queueUrl);
      }),
    ]);
  }
}
