import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

async function getVersionsFromEsb(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  from: number,
  size: number,
  formattedVersionData: Jira.Type.VersionBody[] = []
): Promise<Jira.Type.VersionBody[]> {
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
    const formattedData = (await searchedDataFormatorWithDeleted(
      versionData
    )) as Jira.Type.VersionBody[];
    formattedVersionData.push(...formattedData);
    if (formattedData.length < size) {
      return formattedVersionData;
    }
    return getVersionsFromEsb(projectId, orgId, reqCtx, from + size, size, formattedVersionData);
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getAllVersions.error', error: `${error}` });
    throw error;
  }
}

export async function getAllVersions(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  from = 0,
  size = 10,
  formattedVersionData: Jira.Type.VersionBody[] = []
): Promise<Jira.Type.VersionBody[]> {
  try {
    const versionData = await getVersionsFromEsb(
      projectId,
      orgId,
      reqCtx,
      from,
      size,
      formattedVersionData
    );
    return await Promise.all(
      versionData.map(async (version: Jira.Type.VersionBody) => ({
        id: version.id,
        projectId: version.projectId,
        name: version.name,
        description: version.description,
        startDate: version.startDate,
        releaseDate: version.releaseDate,
        organizationId: version.organizationId,
        status: version.status,
        projectKey: version.projectKey,
      }))
    );
  } catch (error: unknown) {
    logger.error({ ...reqCtx, message: 'getAllVersions.error', error: `${error}` });
    throw error;
  }
}
