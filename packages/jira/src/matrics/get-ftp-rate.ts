/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { FtpBucket, IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { BoolQuery } from 'elastic-builder';
import _ from 'lodash';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { HitBody } from 'abstraction/other/type';
import { getVersion } from '../lib/get-version';
import { getSprints } from '../lib/get-sprints';
import { getBoardByOrgId } from '../repository/board/get-board';
import { getOrganizationById } from '../repository/organization/get-organization';
import { IssueResponse, searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

function getJiraLink(orgName: string, projectKey: string, sprintId: number): string {
  return encodeURI(
    `https://${orgName}.atlassian.net/jira/software/c/projects/${projectKey}/issues/?jql=project =
     "${projectKey}" and sprint = ${sprintId} and labels in (FTP, FTF) ORDER BY created DESC`
  );
}

function getJiraLinkForVersion(orgName: string, projectKey: string, versionId: number): string {
  return encodeURI(
    `https://${orgName}.atlassian.net/jira/software/c/projects/${projectKey}/issues/?jql=project =
     "${projectKey}" and fixVersion = ${versionId} and labels in (FTF, FTP) ORDER BY created DESC`
  );
}

/**
 * Constructs a BoolQuery object for querying Elasticsearch.
 * @param sprintIds - An array of sprint IDs to filter the query.
 * @returns The constructed BoolQuery object.
 */
function boolQuery(ids: string[], idType: FILTER_ID_TYPES): BoolQuery {
  // Configuration for different ID types
  const idTypeConfig = {
    [FILTER_ID_TYPES.VERSION]: {
      filterField: 'body.affectedVersion',
      logMessage: 'issue headline by release query'
    },
    [FILTER_ID_TYPES.SPRINT]: {
      filterField: 'body.sprintId',
      logMessage: 'issue headline by sprint query'
    }
  };

  // Get configuration for the requested ID type
  const config = idTypeConfig[idType];
  if (!config) {
    throw new Error(`Invalid idType: ${idType}. Must be either 'sprint' or 'version'`);
  }
  return esb
    .boolQuery()
    .must([
      esb.termsQuery(config.filterField, ids),
      esb.termQuery('body.isDeleted', false),
      esb.termsQuery('body.issueType', [Jira.Enums.IssuesTypes.TASK, Jira.Enums.IssuesTypes.STORY]),
    ])
    .should([esb.termQuery('body.isFTP', true), esb.termQuery('body.isFTF', true)])
    .minimumShouldMatch(1);
}

/**
 * Retrieves the FTP rate response for the given sprint IDs.
 * @param sprintIds An array of sprint IDs.
 * @returns A promise that resolves to the FTP rate response.
 */
async function ftpGraphRateResponse(
  ids: string[],
  idType: FILTER_ID_TYPES,
  reqCtx: Other.Type.RequestCtx
): Promise<IFtpRateResponse> {
  const config = {
    [FILTER_ID_TYPES.SPRINT]: {
      bucketField: 'body.sprintId',
      bucketName: 'sprint_buckets'
    },
    [FILTER_ID_TYPES.VERSION]: {
      bucketField: 'body.affectedVersion',
      bucketName: 'version_buckets'
    }
  };

  // Validate ID type
  if (!config[idType]) {
    logger.error({
      message: `Invalid idType: ${idType}. Must be either 'sprint' or 'version'`,
      data: { idType: idType },
    });
    throw new Error(`Invalid idType: ${idType}. Must be either 'sprint' or 'version'`);
  }

  const { bucketField, bucketName } = config[idType];
  const ftpRateGraphQuery = esb
    .requestBodySearch()
    .size(1)
    .query(boolQuery(ids, idType))
    .agg(
      esb
        .termsAggregation(bucketName, bucketField)
        .size(ids.length)
        .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
    )
    .toJSON();

  logger.info({ ...reqCtx, message: 'ftpRateGraphQuery', data: { ftpRateGraphQuery } });

  return esClientObj.queryAggs<IFtpRateResponse>(Jira.Enums.IndexName.Issue, ftpRateGraphQuery);

}

/**
 * Fetches organization and project data
 */
async function getOrgAndProjectData(
  organizationId: string,
  projectId: string,
  reqCtx: Other.Type.RequestCtx
): Promise<{ orgName: string, projectKey: string }> {
  const query = esb.requestBodySearch().query(esb.termQuery('body.id', projectId)).toJSON();
  const [orgData, projects] = await Promise.all([
    getOrganizationById(organizationId),
    esClientObj.search(Jira.Enums.IndexName.Project, query),
  ]);

  const projectData = await searchedDataFormator(projects);

  if (orgData.length === 0 || projectData.length === 0) {
    logger.error({
      ...reqCtx,
      message: `Organization ${organizationId} or Project ${projectId} not found`,
    });
    throw new Error(`Organization ${organizationId} or Project ${projectId} not found`);
  }

  return {
    orgName: orgData[0].name,
    projectKey: projectData[0].key
  };
}

/**
 * Calculates FTP metrics from bucket data
 */
function calculateFtpMetrics(ftpData: FtpBucket | undefined): { total: number, totalFtp: number, percentValue: number } {
  const total = ftpData?.doc_count ?? 0;
  const totalFtp = ftpData?.isFTP_true_count?.doc_count ?? 0;
  const percentValue = totalFtp === 0 || total === 0 ? 0 : (totalFtp / total) * 100;

  return { total, totalFtp, percentValue };
}


/**
 * Processes version data
 */
async function processVersionData(
  versionIds: string[],
  ftpRateGraphResponse: IFtpRateResponse,
  orgName: string,
  projectKey: string,
  reqCtx: Other.Type.RequestCtx
): Promise<IssueResponse[]> {
  return Promise.all(
    versionIds.map(async (versionId) => {
      const versionData = await getVersion(versionId);

      logger.info({ ...reqCtx, message: 'versionData', data: { versionData } });

      const ftpData = ftpRateGraphResponse?.version_buckets?.buckets?.find(
        (obj) => obj.key === versionId
      );
      // Calculate percentages
      const { total, totalFtp, percentValue } = calculateFtpMetrics(ftpData);

      // Extract ID for link generation
      const extractVersionId = (id: string): string => id.split('_').pop() || '';
      return {
        total,
        totalFtp,
        releaseName: versionData.name,
        boardName: null,
        status: versionData.status,
        startDate: versionData.startDate,
        releaseDate: versionData.releaseDate,
        percentValue: Number.isNaN(percentValue) ? 0 : Number(percentValue.toFixed(2)),
        linkToJira: getJiraLinkForVersion(orgName, projectKey, Number(extractVersionId(versionId))),
      };
    })
  );
}

/**
 * Processes sprint data
 */
async function processSprintData(
  sprintIds: string[],
  ftpRateGraphResponse: IFtpRateResponse,
  orgName: string,
  projectKey: string,
  reqCtx: Other.Type.RequestCtx
): Promise<IssueResponse[]> {
  return Promise.all(
    sprintIds.map(async (sprintId) => {
      const sprintData = await getSprints(sprintId);
      logger.info({ ...reqCtx, message: 'sprintData', data: { sprintData } });

      const boardName = await getBoardByOrgId(
        sprintData?.originBoardId,
        sprintData?.organizationId,
        reqCtx
      );

      const ftpData = ftpRateGraphResponse?.sprint_buckets?.buckets?.find(
        (obj) => obj.key === sprintId
      );
      // Calculate percentages
      const { total, totalFtp, percentValue } = calculateFtpMetrics(ftpData);

      return {
        total,
        totalFtp,
        sprintName: sprintData?.name,
        boardName: boardName?.name,
        status: sprintData?.state,
        startDate: sprintData?.startDate,
        endDate: sprintData?.endDate,
        percentValue: Number.isNaN(percentValue) ? 0 : Number(percentValue.toFixed(2)),
        linkToJira: getJiraLink(orgName, projectKey, sprintData.sprintId),
      };
    })
  );
}

// eslint-disable-next-line max-lines-per-function,
/**
 * Retrieves the FTP rate graph for a given organization, project, and sprint IDs.
 * @param organizationId The ID of the organization.
 * @param projectId The ID of the project.
 * @param sprintIds An array of sprint IDs.
 * @returns A promise that resolves to an array of IssueReponse objects representing the FTP rate graph.
 */
export async function ftpRateGraph(
  organizationId: string,
  projectId: string,
  ids: string[],
  idType: FILTER_ID_TYPES,
  reqCtx: Other.Type.RequestCtx
): Promise<IssueResponse[]> {
  try {
    // Fetch organization and project data
    const { orgName, projectKey } = await getOrgAndProjectData(organizationId, projectId, reqCtx);

    const ftpRateGraphResponse: IFtpRateResponse = await ftpGraphRateResponse(ids, idType, reqCtx);
    // Process data according to type
    let response: IssueResponse[];
    if (idType === FILTER_ID_TYPES.VERSION) {
      response = await processVersionData(ids, ftpRateGraphResponse, orgName, projectKey, reqCtx);
    } else if (idType === FILTER_ID_TYPES.SPRINT) {
      response = await processSprintData(ids, ftpRateGraphResponse, orgName, projectKey, reqCtx);
    } else {
      throw new Error(`Unsupported ID type: ${idType}`);
    }

    // Sort and filter results
    response = _.sortBy(response, [(item: IssueResponse): Date => new Date(item.startDate)])
      .reverse();
    logger.info({ ...reqCtx, message: 'response', data: response });
    return response;
  } catch (e) {
    logger.error({ ...reqCtx, message: 'ftpRateGraphQuery.error', error: e });
    throw e;
  }
}

/**
 * Retrieves the FTP graph query response for the given IDs.
 *
 * @param ids - An array of IDs (sprint or release).
 * @param idType - Type of IDs ('sprint' or 'release')
 * @param reqCtx - Request context for logging
 * @returns A Promise that resolves to the FTP graph query response.
 */
async function ftpGraphQueryResponse(
  ids: string[],
  idType: FILTER_ID_TYPES,
  reqCtx: Other.Type.RequestCtx
): Promise<HitBody> {
  const ftpRateGraphQuery = esb
    .requestBodySearch()
    .size(0)
    .query(boolQuery(ids, idType).mustNot(esb.termQuery('body.priority', 'HIGH')))
    .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
    .toJSON();

  logger.info({ ...reqCtx, message: 'AvgftpRateGraphQuery', data: { ftpRateGraphQuery } });

  return esClientObj.search(Jira.Enums.IndexName.Issue, ftpRateGraphQuery);
}

/**
 * Calculates the average FTP rate for the given sprint IDs.
 * @param sprintIds - An array of sprint IDs.
 * @returns A promise that resolves to an object containing the total number of items,
 * total number of FTP items, and the percentage value.
 */
export async function ftpRateGraphAvg(
  ids: string[],
  idType: FILTER_ID_TYPES,
  reqCtx: Other.Type.RequestCtx
): Promise<{ total: string; totalFtp: string; percentValue: number }> {
  try {
    const ftpRateGraphResponse = await ftpGraphQueryResponse(ids, idType, reqCtx);
    return {
      total: ftpRateGraphResponse.hits.total.value ?? 0,
      totalFtp: ftpRateGraphResponse.aggregations.isFTP_true_count.doc_count ?? 0,
      percentValue:
        ftpRateGraphResponse.aggregations.isFTP_true_count.doc_count === 0
          ? 0
          : Number(
            (
              (ftpRateGraphResponse.aggregations.isFTP_true_count.doc_count /
                ftpRateGraphResponse.hits.total.value) *
              100
            ).toFixed(2)
          ),
    };
  } catch (e) {
    logger.error({ ...reqCtx, message: 'ftpRateGraphQuery.error', error: e });
    throw e;
  }
}
