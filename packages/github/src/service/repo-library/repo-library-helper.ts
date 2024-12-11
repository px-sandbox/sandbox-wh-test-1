import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getNodeLibInfo } from 'src/util/node-library-info';
import { Config } from 'sst/node/config';
import { v4 as uuid } from 'uuid';
import { mappingPrefixes } from '../../constant/config';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { LibParamsMapping } from '../../model/lib-master-mapping';
import { deleteProcessfromDdb } from 'rp';
import { chunk } from 'lodash';

const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();

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
  const excludedLibraries = ["@studiographene/nodejs-telemetry"];
  if (data) {
    const {
      coreDependencies,
      repositoryInfo: { repoId, repoOwner: orgName },
      dependencies,
      processId,
    } = data;

    const uniqueDeps = dependencies.filter(
      (dep, index, self) =>
        index ===
        self.findIndex(
          (t) => t.dependencyName === dep.dependencyName && t.currentVersion === dep.currentVersion
        )
    );
    await deletePrevDependencies(repoId);

    const combinedDeps = [
      ...uniqueDeps.map((dep) => ({ ...dep, repoId, orgName, isCore: false, processId })),
      ...coreDependencies.map((dep) => ({ ...dep, repoId, orgName, isCore: true, processId })),
    ];

    const ddbPutData: Array<Github.Type.LibraryRecord> = [];
    const repoLibFormattedData: Array<Github.Type.RepoLibrary> = await Promise.all(
      combinedDeps.filter(dep => !(excludedLibraries.includes(dep.dependencyName))).map(async (dep) => {
        const { current, latest } = await getNodeLibInfo(dep.dependencyName, dep.currentVersion);
        ddbPutData.push({
          libName: `npm_${dep.dependencyName}`,
          version: latest.version,
          releaseDate: latest.releaseDate,
          isDeprecated: latest.isDeprecated,
        });
        return {
          _id: uuid(),
          body: {
            repoId: `${mappingPrefixes.repo}_${repoId}`,
            organizationId: `${mappingPrefixes.organization}_${Config.GIT_ORGANIZATION_ID}`,
            version: dep.currentVersion,
            name: dep.dependencyName,
            libName: `npm_${dep.dependencyName}`,
            releaseDate: current.releaseDate,
            isDeleted: false,
            isCore: dep.isCore,
            isDeprecated: current.isDeprecated,
          },
        };
      })
    );
    const ddbPutDataChunks = chunk(ddbPutData, 25);

    const batchWritePromises = ddbPutDataChunks.map((chunk) =>
      dynamodbClient.batchWrite(new LibParamsMapping().preparePutParamsBulk(chunk))
    );
    await Promise.all([
      ...batchWritePromises,
      esClientObj.bulkInsert(Github.Enums.IndexName.GitRepoLibrary, repoLibFormattedData),
      deleteProcessfromDdb(processId, reqCtx),
    ]);
  }
}
