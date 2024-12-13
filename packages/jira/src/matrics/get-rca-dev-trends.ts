import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes } from 'abstraction/jira/enums';
import {
  rcaDetailResponse,
  rcaDetailType,
  rcaTableHeadline,
  rcaTrendsResponse,
} from 'abstraction/jira/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getSprints } from 'src/lib/get-sprints';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClient = ElasticSearchClient.getInstance();

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

async function getHeadline(type: string, rcaId: string) {
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
          esb.termQuery(`body.rcaData.${type}`, `jira_rca_${rcaId}`),
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
                ])
            ),
        ])
    );

  const result: rcaTableHeadline = await esClient.queryAggs(
    Jira.Enums.IndexName.Issue,
    query.toJSON()
  );
  return result;
}

export async function getRcaDevTrends(
  sprintIds: string[],
  rca: string
): Promise<rcaTrendsResponse[]> {
  logger.info({ message: 'rca.dev.trends', data: { sprintIds, rca } });
  const rcaData = await getRCAName(rca, 'dev');
  const headline = await getHeadline('devRca', rcaData[0].id);
  if (rcaData.length === 0) {
    return [];
  }
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
          esb.termQuery('body.rcaData.devRca', `jira_rca_${rcaData[0].id}`),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(100)
        .field('body.sprintId')
        .aggs([
          esb.filterAggregation('high_count', esb.termQuery('body.priority', 'High')),
          esb.filterAggregation('highest_count', esb.termQuery('body.priority', 'Highest')),
          esb.filterAggregation('medium_count', esb.termQuery('body.priority', 'Medium')),
          esb.filterAggregation('low_count', esb.termQuery('body.priority', 'Low')),
          esb.filterAggregation('lowest_count', esb.termQuery('body.priority', 'Lowest')),
        ])
    )
    .toJSON();

  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  return await Promise.all(
    response.by_rca.buckets.map(async (item) => {
      const sprintData = await getSprints(item.key);
      return {
        headline: {
          value: parseFloat(
            (
              (headline.max_rca_count.value / headline.global_agg.total_bug_count.doc_count) *
              100
            ).toFixed(2)
          ),
          names: rca,
        },
        sprintName: sprintData?.name ?? '',
        highest: item.highest_count.doc_count,
        high: item.high_count.doc_count,
        medium: item.medium_count.doc_count,
        low: item.low_count.doc_count,
        lowest: item.lowest_count.doc_count,
      };
    })
  );
}

export async function getRcaQaTrends(
  sprintIds: string[],
  rca: string
): Promise<rcaTrendsResponse[]> {
  logger.info({ message: 'rca.qa.trends', data: { sprintIds, rca } });
  const rcaData = await getRCAName(rca, 'qa');
  const headline = await getHeadline('qaRca', rcaData[0].id);
  if (rcaData.length === 0) {
    return [];
  }
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', 'Bug'),
          esb.termQuery('body.containsQARca', true),
          esb.termQuery('body.rcaData.qaRca', rcaData.id),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(100)
        .field('body.sprintId')
        .aggs([
          esb.filterAggregation('high_count', esb.termQuery('body.priority', 'High')),
          esb.filterAggregation('highest_count', esb.termQuery('body.priority', 'Highest')),
          esb.filterAggregation('medium_count', esb.termQuery('body.priority', 'Medium')),
          esb.filterAggregation('low_count', esb.termQuery('body.priority', 'Low')),
          esb.filterAggregation('lowest_count', esb.termQuery('body.priority', 'Lowest')),
        ])
    )
    .toJSON();

  const response: rcaDetailResponse = await esClient.queryAggs(Jira.Enums.IndexName.Issue, query);
  return await Promise.all(
    response.by_rca.buckets.map(async (item) => {
      const sprintData = await getSprints(item.key);
      return {
        headline: {
          value: parseFloat(
            (
              (headline.max_rca_count.value / headline.global_agg.total_bug_count.doc_count) *
              100
            ).toFixed(2)
          ),
          names: rca,
        },
        sprintName: sprintData?.name ?? '',
        highest: item.highest_count.doc_count,
        high: item.high_count.doc_count,
        medium: item.medium_count.doc_count,
        low: item.low_count.doc_count,
        lowest: item.lowest_count.doc_count,
      };
    })
  );
}
