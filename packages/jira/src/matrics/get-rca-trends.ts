import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { FILTER_ID_TYPES, IssuesTypes, State } from 'abstraction/jira/enums';
import { Sprint } from 'abstraction/jira/external/api';
import {
  rcaDetailResponse,
  rcaTableHeadline,
  rcaTrendsFilteredResponse,
  rcaTrendsResponse,
} from 'abstraction/jira/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator, Version } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

/**
 * Gets RCA name based on type
 * @param rca - RCA name
 * @param type - RCA type
 * @returns RCA data
 */
async function getRCAName(rca: string, type: string): Promise<HitBody> {
  const query = esb
    .requestBodySearch()
    .size(1)
    .query(
      esb.boolQuery().must([esb.termQuery('body.name', rca), esb.termQuery('body.type', type)])
    )
    .toJSON();
  const response = await esClient.search(Jira.Enums.IndexName.Rca, query);
  const rcaData = await searchedDataFormator(response);
  return rcaData;
}

/**
 * Gets sprint data for given sprint IDs
 * @param sprintIds - Array of sprint IDs
 * @returns Array of sprint data
 */
async function getSprints(sprintIds: string[]): Promise<Sprint[]> {
  const query = esb
    .requestBodySearch()
    .size(sprintIds.length)
    .query(
      esb
        .boolQuery()
        .must(esb.termsQuery('body.id', sprintIds))
        .should([
          esb.termQuery('body.state', State.ACTIVE),
          esb.termQuery('body.state', State.CLOSED),
        ])
        .minimumShouldMatch(1)
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();

  const body = await esClient.search(Jira.Enums.IndexName.Sprint, query);
  const sprint = (await searchedDataFormator(body)) as Sprint[];
  return sprint;
}

/**
 * Gets version data for given version IDs
 * @param versionIds - Array of version IDs
 * @returns Array of version data
 */
async function getVersions(versionIds: string[]): Promise<Version[]> {
  const query = esb
    .requestBodySearch()
    .size(versionIds.length)
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.id', versionIds), esb.termQuery('body.isDeleted', false)])
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();

  const body = await esClient.search(Jira.Enums.IndexName.Version, query);
  const version = (await searchedDataFormator(body)) as Version[];
  return version;
}

/**
 * Gets headline data for RCA trends
 * @param type - RCA type
 * @param rcaId - RCA ID
 * @param ids - Array of IDs (sprint or version)
 * @param idType - Type of IDs (sprint or version)
 * @returns Headline data
 */
async function getHeadline(
  type: string,
  rcaId: string,
  ids: string[],
  idType: FILTER_ID_TYPES
): Promise<rcaTableHeadline> {
  // Configuration for different ID types
  const idTypeConfig = {
    [FILTER_ID_TYPES.VERSION]: {
      filterField: 'body.affectedVersion',
      logMessage: 'issue headline by release query',
    },
    [FILTER_ID_TYPES.SPRINT]: {
      filterField: 'body.sprintId',
      logMessage: 'issue headline by sprint query',
    },
  };

  // Get configuration for the requested ID type
  const config = idTypeConfig[idType];
  if (!config) {
    throw new Error(`Invalid idType: ${idType}. Must be either 'sprint' or 'version'`);
  }

  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.existsQuery('body.rcaData'),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termsQuery('body.priority', ['Highest', 'High', 'Medium']),
          esb.termQuery(`body.rcaData.${type}`, `${mappingPrefixes.rca}_${rcaId}`),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery(config.filterField, ids),
        ])
    )
    .agg(
      esb
        .termsAggregation('rca_count')
        .field(`body.rcaData.${type}`)
        .agg(esb.valueCountAggregation('rca_value_count').field(`body.rcaData.${type}`))
    )
    .agg(esb.maxBucketAggregation('max_rca_count').bucketsPath('rca_count>rca_value_count'))
    .agg(
      esb
        .globalAggregation('global_agg')
        .aggs([
          esb
            .filterAggregation('total_bug_count')
            .filter(
              esb
                .boolQuery()
                .must([
                  esb.termQuery('body.issueType', IssuesTypes.BUG),
                  esb.existsQuery(`body.rcaData.${type}`),
                  esb.termQuery('body.isDeleted', false),
                  esb.termsQuery(config.filterField, ids),
                ])
            ),
        ])
    );
  logger.info({ message: 'rca.trends_headline_data', data: query });
  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );
  return result;
}

/**
 * Processes sprint data for RCA trends
 * @param sprintIds - Array of sprint IDs
 * @param response - RCA detail response
 * @returns Processed sprint data
 */
async function processSprintData(
  sprintIds: string[],
  response: rcaDetailResponse
): Promise<rcaTrendsFilteredResponse[]> {
  const sprintData = await getSprints(sprintIds);
  const rcaGraphData = await Promise.all(
    sprintIds.map(async (sprintId) => {
      const findInResponse = response.by_rca.buckets.find((item) => item.key === sprintId);
      const sprint = sprintData.find((items) => String(items.id) === sprintId);
      const sprintName = sprint?.name ?? '';
      const sprintCreated = sprint?.startDate ?? '';
      return {
        sprintName,
        high: findInResponse?.high_count.doc_count ?? 0,
        highest: findInResponse?.highest_count.doc_count ?? 0,
        medium: findInResponse?.medium_count.doc_count ?? 0,
        low: findInResponse?.low_count.doc_count ?? 0,
        lowest: findInResponse?.lowest_count.doc_count ?? 0,
        sprintCreated,
      };
    })
  );
  logger.info({ message: 'rca.trends_sprint_data', data: rcaGraphData });
  const rcaGraphDataSorted = _.orderBy(rcaGraphData, ['sprintCreated'], ['asc']);
  const rcaGraphDataFiltered = rcaGraphDataSorted.map((rest) => _.omit(rest, 'sprintCreated'));
  return rcaGraphDataFiltered;
}

/**
 * Processes version data for RCA trends
 * @param versionIds - Array of version IDs
 * @param response - RCA detail response
 * @returns Processed version data
 */
async function processVersionData(
  versionIds: string[],
  response: rcaDetailResponse
): Promise<rcaTrendsFilteredResponse[]> {
  const versionData = await getVersions(versionIds);
  const rcaGraphData = await Promise.all(
    versionIds.map(async (versionId) => {
      const findInResponse = response.by_rca.buckets.find((item) => item.key === versionId);
      const version = versionData.find((items) => String(items.id) === versionId);
      const versionName = version?.name ?? '';
      const versionCreated = version?.startDate ?? '';
      return {
        versionName,
        high: findInResponse?.high_count.doc_count ?? 0,
        highest: findInResponse?.highest_count.doc_count ?? 0,
        medium: findInResponse?.medium_count.doc_count ?? 0,
        low: findInResponse?.low_count.doc_count ?? 0,
        lowest: findInResponse?.lowest_count.doc_count ?? 0,
        versionCreated,
      };
    })
  );
  logger.info({ message: 'rca.trends_version_data', data: rcaGraphData });
  const rcaGraphDataSorted = _.orderBy(rcaGraphData, ['versionCreated'], ['asc']);
  const rcaGraphDataFiltered = rcaGraphDataSorted.map((rest) => _.omit(rest, 'versionCreated'));
  return rcaGraphDataFiltered;
}

/**
 * Gets RCA trends data
 * @param ids - Array of IDs (sprint or version)
 * @param rca - RCA name
 * @param type - RCA type
 * @param idType - Type of IDs (sprint or version)
 * @returns RCA trends data
 */
export async function getRcaTrends(
  ids: string[],
  rca: string,
  type: string,
  idType: FILTER_ID_TYPES
): Promise<rcaTrendsResponse> {
  logger.info({ message: 'rca.trends', data: { ids, rca } });
  const rcaNameType = type === 'qaRca' ? 'qa' : 'dev';
  const rcaData = await getRCAName(rca, rcaNameType);
  logger.info({ message: 'rca.trends_category_data', data: { rcaData } });
  const headline = await getHeadline(type, rcaData[0]?.id, ids, idType);
  // Configuration for different ID types
  const idTypeConfig = {
    [FILTER_ID_TYPES.VERSION]: {
      filterField: 'body.affectedVersion',
      logMessage: 'issue headline by release query',
    },
    [FILTER_ID_TYPES.SPRINT]: {
      filterField: 'body.sprintId',
      logMessage: 'issue headline by sprint query',
    },
  };

  // Get configuration for the requested ID type
  const config = idTypeConfig[idType];
  if (!config) {
    throw new Error(`Invalid idType: ${idType}. Must be either 'sprint' or 'version'`);
  }
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery(config.filterField, ids),
          esb.termQuery('body.issueType', 'Bug'),
          esb.termQuery(`body.rcaData.${type}`, `${mappingPrefixes.rca}_${rcaData[0]?.id}`),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(ids.length)
        .field(config.filterField)
        .aggs([
          esb.filterAggregation('high_count', esb.termQuery('body.priority', 'High')),
          esb.filterAggregation('highest_count', esb.termQuery('body.priority', 'Highest')),
          esb.filterAggregation('medium_count', esb.termQuery('body.priority', 'Medium')),
          esb.filterAggregation('low_count', esb.termQuery('body.priority', 'Low')),
          esb.filterAggregation('lowest_count', esb.termQuery('body.priority', 'Lowest')),
        ])
    )
    .toJSON();
  logger.info({ message: 'rca.trends_detail_data', data: query });
  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);

  let rcaGraphDataFiltered: rcaTrendsFilteredResponse[] = [];
  if (idType === FILTER_ID_TYPES.SPRINT) {
    rcaGraphDataFiltered = await processSprintData(ids, response);
  } else if (idType === FILTER_ID_TYPES.VERSION) {
    rcaGraphDataFiltered = await processVersionData(ids, response);
  }
  return {
    headline: {
      value:
        headline.global_agg.total_bug_count.doc_count === 0
          ? 0
          : parseFloat(
              (
                (headline.max_rca_count.value / headline.global_agg.total_bug_count.doc_count) *
                100
              ).toFixed(2)
            ),
      names: rca,
    },
    trendsData: rcaGraphDataFiltered,
  };
}
