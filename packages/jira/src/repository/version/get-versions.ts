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
      .sort(esb.sort('body.status', 'asc'))
      .sort(esb.sort('body.releaseDate', 'desc'))
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
    logger.error({ ...reqCtx, message: 'getVersionsFromEsb.error', error: `${error}` });
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

    // Separate versions into released and unreleased arrays
    const releasedVersions = versionData.filter(
      (version) => version.status === Jira.Enums.VersionStatus.RELEASED
    );
    const unreleasedVersions = versionData.filter(
      (version) => version.status === Jira.Enums.VersionStatus.UNRELEASED
    );

    // Sort function to put null/undefined dates first, then sort by date (descending)
    const sortByDateWithNullsFirst = (
      a: Jira.Type.VersionBody,
      b: Jira.Type.VersionBody
    ): number => {
      // If both have dates, sort by date (descending)
      if (a.releaseDate && b.releaseDate) {
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      }
      if (a.releaseDate) {
        // If only a has a date, b comes first
        return 1;
      }
      // If only b has a date, a comes first
      return -1;
    };

    // Sort each array individually
    releasedVersions.sort(sortByDateWithNullsFirst);
    unreleasedVersions.sort(sortByDateWithNullsFirst);

    // Merge the arrays with released first, then unreleased
    const sortedVersions = [...unreleasedVersions, ...releasedVersions];

    return await Promise.all(
      sortedVersions.map(async (version: Jira.Type.VersionBody) => ({
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
