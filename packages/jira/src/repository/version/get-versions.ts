import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormatorWithDeleted } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const formattedBoardData: Other.Type.HitBody = [];
async function getVersionsFromEsb(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  from: number,
  size: number
): Promise<Other.Type.HitBody> {
  try {
    const matchQry = esb
      .requestBodySearch()
      .from(from)
      .size(size)
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.projectId', projectId),
            esb.termQuery('body.organizationId', orgId),
            esb.termQuery('body.isDeleted', false),
          ])
      )
      .toJSON();
    const versionData = await esClientObj.search(Jira.Enums.IndexName.Version, matchQry);
    const formattedData = await searchedDataFormatorWithDeleted(versionData);
    formattedBoardData.push(...formattedData);
    if (formattedData.length < size) {
      return formattedBoardData;
    } else {
      return getAllVersions(projectId, orgId, reqCtx, from + size, size);
    }
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getAllVersions.error', error: `${error}` });
    throw error;
  }
}

export async function getAllVersions(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  from: number = 0,
  size: number = 2
): Promise<Jira.Type.VersionBody[]> {
  try {
    const versionData = await getVersionsFromEsb(projectId, orgId, reqCtx, from, size);
    return await Promise.all(
      versionData.map(async (version: Jira.Type.VersionBody) => {
        return {
          id: version.id,
          projectId: version.projectId,
          name: version.name,
          description: version.description,
          startDate: version.startDate,
          releaseDate: version.releaseDate,
          organizationId: version.organizationId,
          status: version.status,
          projectKey: version.projectKey,
        };
      })
    );
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getAllVersions.error', error: `${error}` });
    throw error;
  }
}
