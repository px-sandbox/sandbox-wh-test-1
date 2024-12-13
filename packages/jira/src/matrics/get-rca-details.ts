import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { currType, rcaDetailResponse, rcaDetailType } from 'abstraction/jira/type';
import esb from 'elastic-builder';
import { mapRcaBucketsWithFullNames } from './get-rca-tabular-view';

const esClient = ElasticSearchClient.getInstance();
export async function rcaDevDetail(sprintIds: string[]): Promise<rcaDetailType[]> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', 'Bug'),
          esb.termQuery('body.containsDevRca', true),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(100)
        .field('body.rcaData.devRca')
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

  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames('dev');

  return response.by_rca.buckets.map((item) => {
    const rcaName = updatedQaRcaBuckets[item.key];
    const count = item.doc_count;
    return {
      name: rcaName,
      highest: item.highest_count.doc_count,
      high: item.high_count.doc_count,
      medium: item.medium_count.doc_count,
      low: item.low_count.doc_count,
      lowest: item.lowest_count.doc_count,
      total: count,
    };
  });
}

export async function rcaQaDetail(sprintIds: string[]): Promise<rcaDetailType[]> {
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', 'Bug'),
          esb.termQuery('body.containsQaRca', true),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(100)
        .field('body.rcaData.qaRca')
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

  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  const updatedQaRcaBuckets = await mapRcaBucketsWithFullNames('qa');

  return response.by_rca.buckets.map((item) => {
    const rcaName = updatedQaRcaBuckets[item.key];
    const count = item.doc_count;
    return {
      name: rcaName,
      highest: item.highest_count.doc_count,
      high: item.high_count.doc_count,
      medium: item.medium_count.doc_count,
      low: item.low_count.doc_count,
      lowest: item.lowest_count.doc_count,
      total: count,
    };
  });
}
