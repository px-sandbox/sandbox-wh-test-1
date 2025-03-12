import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import { rcaTableHeadline, rcaTableResponse, rcaTableView } from 'abstraction/jira/type';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { logger } from 'core';

const esClient = ElasticSearchClient.getInstance();
export async function mapRcaBucketsWithFullNames(): Promise<{ [key: string]: string }> {
  const rcaNameQuery = esb.requestBodySearch().query(esb.matchAllQuery()).size(100).toJSON();
  const rcaRes = await esClient.search(Jira.Enums.IndexName.Rca, rcaNameQuery);
  const resData = await searchedDataFormator(rcaRes);
  const idToNameMap = resData.reduce((acc: any, hit: any) => {
    const id = `${mappingPrefixes.rca}_${hit.id}`;
    const { name } = hit;
    acc[id] = name;
    return acc;
  }, {});
  return idToNameMap;
}

async function getHeadline(type: string, sprintIds: string[]): Promise<rcaTableHeadline> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termsQuery('body.priority', ['Highest', 'High', 'Medium']),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.sprintId', sprintIds),
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
                  esb.existsQuery(`body.rcaData.${type}`),
                  esb.termQuery('body.issueType', IssuesTypes.BUG),
                  esb.termQuery('body.isDeleted', false),
                  esb.termsQuery('body.sprintId', sprintIds),
                ])
            ),
        ])
    );
  logger.info({ message: 'issue headline by sprint query', data: query });
  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );
  return result;
}

async function getHeadlineByVersion(type: string, versionIds: string[]): Promise<rcaTableHeadline> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.termsQuery('body.priority', ['Highest', 'High', 'Medium']),
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.affectedVersion', versionIds),
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
                  esb.existsQuery(`body.rcaData.${type}`),
                  esb.termQuery('body.issueType', IssuesTypes.BUG),
                  esb.termQuery('body.isDeleted', false),
                  esb.termsQuery('body.affectedVersion', versionIds),
                ])
            ),
        ])
    );
  logger.info({ message: 'issue headline by release query', data: query });
  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );

  return result;
}

export async function rcaTableView(ids: string[], idType: FILTER_ID_TYPES, type: string): Promise<rcaTableView> {
  // Build query based on ID type
  const query = await buildRcaTableViewQuery(ids, idType, type);

  logger.info({ message: 'rcaTableView query', data: query });

  const response: rcaTableResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);

  const QaRcaBuckets = response.rcaCount?.buckets.map((bucket) => ({
    name: bucket.key,
    count: bucket.doc_count,
  }));
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();
  const headlineRCA = (idType === FILTER_ID_TYPES.VERSION) ? await getHeadlineByVersion(type, ids) : await getHeadline(type, ids);
  const data = QaRcaBuckets.map((bucket: { name: string | number; count: number }) => {
    const fullName = updatedQaRcaBuckets[bucket.name];
    return { name: fullName ?? '', count: bucket.count };
  });
  const headlineRCANames = headlineRCA.max_rca_count.keys.map((name) => updatedQaRcaBuckets[name]);
  return {
    headline: {
      value:
        headlineRCA.global_agg.total_bug_count.doc_count === 0
          ? 0
          : parseFloat(
            (
              (headlineRCA.max_rca_count.value /
                headlineRCA.global_agg.total_bug_count.doc_count) *
              100
            ).toFixed(2)
          ),
      names: headlineRCANames,
    },
    tableData: data,
  };
}

/**
 * Build query for RCA table view based on ID type
 */
export async function buildRcaTableViewQuery(ids: string[], idType: FILTER_ID_TYPES, type: string): Promise<object> {
  // Configuration for different ID types
  const idTypeConfig = {
    [FILTER_ID_TYPES.VERSION]: {
      filterField: 'body.affectedVersion'
    },
    [FILTER_ID_TYPES.SPRINT]: {
      filterField: 'body.sprintId'
    }
  };

  // Get configuration for the requested ID type
  const config = idTypeConfig[idType];
  if (!config) {
    throw new Error(`Invalid idType: ${idType}. Must be either 'sprint' or 'version'`);
  }

  // Build the query with the appropriate filter field
  return esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery(config.filterField, ids),
          esb.termQuery('body.issueType', IssuesTypes.BUG),
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(esb.termsAggregation('rcaCount').field(`body.rcaData.${type}`).size(1000))
    .toJSON();
}