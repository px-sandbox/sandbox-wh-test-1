import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { IssuesTypes, SprintState } from 'abstraction/jira/enums';
import { Sprint } from 'abstraction/jira/external/api';
import { rcaDetailResponse, rcaTableHeadline, rcaTrendsResponse } from 'abstraction/jira/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import _ from 'lodash';
import { mappingPrefixes } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

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
async function getSprints(sprintIds: string[]): Promise<Sprint[]> {
  const query = esb
    .requestBodySearch()
    .size(sprintIds.length)
    .query(
      esb
        .boolQuery()
        .must(esb.termsQuery('body.id', sprintIds))
        .should([
          esb.termQuery('body.state', SprintState.ACTIVE),
          esb.termQuery('body.state', SprintState.CLOSED),
        ])
        .minimumShouldMatch(1)
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();

  const body = await esClient.search(Jira.Enums.IndexName.Sprint, query);
  const sprint = (await searchedDataFormator(body)) as Sprint[];
  return sprint;
}
async function getHeadline(
  type: string,
  rcaId: string,
  sprintIds: string[]
): Promise<rcaTableHeadline> {
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
                  esb.termQuery('body.issueType', IssuesTypes.BUG),
                  esb.existsQuery(`body.rcaData.${type}`),
                  esb.termQuery('body.isDeleted', false),
                  esb.termsQuery('body.sprintId', sprintIds),
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

export async function getRcaTrends(
  sprintIds: string[],
  rca: string,
  type: string
): Promise<rcaTrendsResponse> {
  logger.info({ message: 'rca.trends', data: { sprintIds, rca } });
  const rcaNameType = type === 'qaRca' ? 'qa' : 'dev';
  const rcaData = await getRCAName(rca, rcaNameType);
  logger.info({ message: 'rca.trends_category_data', data: { rcaData } });
  const headline = await getHeadline(type, rcaData[0]?.id, sprintIds);
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintIds),
          esb.termQuery('body.issueType', 'Bug'),
          esb.termQuery(`body.rcaData.${type}`, `${mappingPrefixes.rca}_${rcaData[0]?.id}`),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(
      esb
        .termsAggregation('by_rca')
        .size(sprintIds.length)
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

  const sprintData = await getSprints(sprintIds);
  const rcaGraphData = await Promise.all(
    sprintIds.map(async (sprintId) => {
      const findInResponse = response.by_rca.buckets.find((item) => item.key === sprintId);
      const SprintName = sprintData.find((sprint) => String(sprint.id) === sprintId);
      const sprintName = SprintName?.name ?? '';
      const sprintCreated = SprintName?.startDate ?? '';
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
  const rcaGraphDataSorted = _.orderBy(rcaGraphData, ['sprintCreated'], ['asc']);

  const rcaGraphDataFiltered = rcaGraphDataSorted.map((rest) => _.omit(rest, 'sprintCreated'));
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
