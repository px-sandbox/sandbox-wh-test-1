import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { rcaDetailResponse, rcaDetailType } from 'abstraction/jira/type';
import esb from 'elastic-builder';
import { mapRcaBucketsWithFullNames } from './get-rca-tabular-view';
import { FILTER_ID_TYPES } from 'abstraction/jira/enums';
import { logger } from 'core';

const esClient = ElasticSearchClient.getInstance();

export async function rcaDetailedView(ids: string[], idType: FILTER_ID_TYPES, type: string): Promise<rcaDetailType[]> {
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
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery(config.filterField, ids),
          esb.termQuery('body.issueType', 'Bug'),
          esb.existsQuery(`body.rcaData.${type}`),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(100)
        .field(`body.rcaData.${type}`)
        .aggs([
          esb.filterAggregation('high_count', esb.termQuery('body.priority', 'High')),
          esb.filterAggregation('highest_count', esb.termQuery('body.priority', 'Highest')),
          esb.filterAggregation('medium_count', esb.termQuery('body.priority', 'Medium')),
          esb.filterAggregation('low_count', esb.termQuery('body.priority', 'Low')),
          esb.filterAggregation('lowest_count', esb.termQuery('body.priority', 'Lowest')),
          esb.valueCountAggregation('total_count').field('body.priority'),
        ])
    )
    .toJSON();
    logger.info({ message: "rca data detail query", data: query });
  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames();

  return response.by_rca.buckets.map((item) => {
    const rcaName = updatedQaRcaBuckets[item.key];
    const count = item.doc_count;
    return {
      name: rcaName ?? '',
      highest: item.highest_count.doc_count,
      high: item.high_count.doc_count,
      medium: item.medium_count.doc_count,
      low: item.low_count.doc_count,
      lowest: item.lowest_count.doc_count,
      total: count,
    };
  });
}
