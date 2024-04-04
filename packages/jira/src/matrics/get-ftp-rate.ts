import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IFtpRateResponse } from 'abstraction/jira/type';
import { logger } from 'core';
import esb, { BoolQuery } from 'elastic-builder';
import _ from 'lodash';
import { getSprints } from '../lib/get-sprints';
import { getBoardByOrgId } from '../repository/board/get-board';
import { getOrganizationById } from '../repository/organization/get-organization';
import { IssueReponse, searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

function getJiraLink(orgName: string, projectKey: string, sprintId: number): string {
  return encodeURI(
    `https://${orgName}.atlassian.net/jira/software/c/projects/${projectKey}/issues/?jql=project =
     "${projectKey}" and sprint = ${sprintId} and labels in (FTP, FTF) ORDER BY created DESC`
  );
}

/**
 * Constructs a BoolQuery object for querying Elasticsearch.
 * @param sprintIds - An array of sprint IDs to filter the query.
 * @returns The constructed BoolQuery object.
 */
function boolQuery(sprintIds: string[]): BoolQuery {
  return esb
    .boolQuery()
    .must([
      esb.termsQuery('body.sprintId', sprintIds),
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
async function ftpGraphRateResponse(sprintIds: string[]): Promise<IFtpRateResponse> {
  const ftpRateGraphQuery = esb
    .requestBodySearch()
    .size(1)
    .query(boolQuery(sprintIds))
    .agg(
      esb
        .termsAggregation('sprint_buckets', 'body.sprintId')
        .size(sprintIds.length)
        .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
    )
    .toJSON();

  logger.info('ftpRateGraphQuery', ftpRateGraphQuery);

  return esClientObj.queryAggs<IFtpRateResponse>(Jira.Enums.IndexName.Issue, ftpRateGraphQuery);
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
  sprintIds: string[]
): Promise<IssueReponse[]> {
  try {
    let orgName = '';
    let projectKey = '';

    const query = esb.requestBodySearch().query(esb.termQuery('body.id', projectId)).toJSON();
    const [orgData, projects] = await Promise.all([
      getOrganizationById(organizationId),
      esClientObj.search(Jira.Enums.IndexName.Project, query),
    ]);

    const projectData = await searchedDataFormator(projects);

    if (orgData.length === 0 || projectData.length === 0) {
      logger.error(`Organization ${organizationId} or Project ${projectId} not found`);
      throw new Error(`Organization ${organizationId} or Project ${projectId} not found`);
    }

    orgName = orgData[0].name;
    projectKey = projectData[0].key;

    const ftpRateGraphResponse: IFtpRateResponse = await ftpGraphRateResponse(sprintIds);
    logger.info('ftpRateGraphResponse', ftpRateGraphResponse);
    let response: IssueReponse[] = await Promise.all(
      sprintIds.map(async (sprintId) => {
        const sprintData = await getSprints(sprintId);
        logger.info('sprintData', sprintData);
        const boardName = await getBoardByOrgId(
          sprintData?.originBoardId,
          sprintData?.organizationId
        );

        const ftpData = ftpRateGraphResponse.sprint_buckets.buckets.find(
          (obj) => obj.key === sprintId
        );

        const total = ftpData?.doc_count ?? 0;
        const totalFtp = ftpData?.isFTP_true_count?.doc_count ?? 0;
        const percentValue = totalFtp === 0 || total === 0 ? 0 : (totalFtp / total) * 100;

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
    response = _.sortBy(response, [
      (item: IssueReponse): Date => new Date(item.startDate),
    ]).reverse();
    return response.filter((obj) => obj.sprintName !== undefined);
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}

/**
 * Retrieves the FTP graph query response for the given sprint IDs.
 *
 * @param sprintIds - An array of sprint IDs.
 * @returns A Promise that resolves to the FTP graph query response.
 */
async function ftpGraphQueryResponse(sprintIds: string[]): Promise<any> {
  const ftpRateGraphQuery = esb
    .requestBodySearch()
    .size(0)
    .query(boolQuery(sprintIds).mustNot(esb.termQuery('body.priority', 'HIGH')))
    .agg(esb.filterAggregation('isFTP_true_count', esb.termQuery('body.isFTP', true)))
    .toJSON();

  logger.info('AvgftpRateGraphQuery', ftpRateGraphQuery);

  // TODO: remove any after testing
  return esClientObj.search(Jira.Enums.IndexName.Issue, ftpRateGraphQuery);
}

/**
 * Calculates the average FTP rate for the given sprint IDs.
 * @param sprintIds - An array of sprint IDs.
 * @returns A promise that resolves to an object containing the total number of items,
 * total number of FTP items, and the percentage value.
 */
export async function ftpRateGraphAvg(
  sprintIds: string[]
): Promise<{ total: string; totalFtp: string; percentValue: number }> {
  try {
    // TODO: remove any after testing
    const ftpRateGraphResponse = await ftpGraphQueryResponse(sprintIds);
    logger.info('ftpRateGraphResponse', ftpRateGraphResponse);
    return {
      total: ftpRateGraphResponse.body.hits.total.value ?? 0,
      totalFtp: ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count ?? 0,
      percentValue:
        ftpRateGraphResponse.body.aggregations.isFTP_true_count.doc_count === 0
          ? 0
          : Number(
              (
                (ftpRateGraphResponse.body.aggregations.isFTP_true_count
                  .doc_count /
                  ftpRateGraphResponse.body.hits.total.value) *
                100
              ).toFixed(2)
            ),
    };
  } catch (e) {
    logger.error('ftpRateGraphQuery.error', e);
    throw e;
  }
}
