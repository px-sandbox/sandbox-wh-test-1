import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esbDateHistogramInterval } from '../constant/config';
import { getWeekDaysCount } from '../util/weekend-calculations';

export async function frequencyOfCodeCommitGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<GraphResponse[]> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const frquencyOfCodeCommitGraphQuery = esb.requestBodySearch().size(0);
    frquencyOfCodeCommitGraphQuery.query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
          esb.termsQuery('body.isMergedCommit', 'false'),
        ])
    );

    // By default graph interval is day
    let graphIntervals: esb.DateHistogramAggregation;

    switch (intervals) {
      case esbDateHistogramInterval.day:
      case esbDateHistogramInterval.month:
      case esbDateHistogramInterval.year:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .calendarInterval(intervals)
          .extendedBounds(startDate, endDate)
          .minDocCount(0);
        break;
      case esbDateHistogramInterval['2d']:
      case esbDateHistogramInterval['3d']:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .fixedInterval(intervals)
          .extendedBounds(startDate, endDate)
          .minDocCount(0);
        break;
      default:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .calendarInterval(esbDateHistogramInterval.month)
          .extendedBounds(startDate, endDate)
          .minDocCount(0);
    }
    frquencyOfCodeCommitGraphQuery.agg(graphIntervals).toJSON();

    logger.info('FREQUENCY_CODE_COMMIT_GRAPH_ESB_QUERY', frquencyOfCodeCommitGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitCommits,
        frquencyOfCodeCommitGraphQuery
      );
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string,
      value: item.doc_count,
    }));
  } catch (e) {
    logger.error('frequencyOfCodeCommitGraph.error', e);
    throw e;
  }
}

export async function frequencyOfCodeCommitAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<{ value: number } | null> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const prCommentAvgQuery = esb.requestBodySearch().size(0);
    prCommentAvgQuery
      .query(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.repoId', repoIds),
            esb.termsQuery('body.isMergedCommit', 'false'),
          ])
      )
      .size(0)
      .toJSON();
    logger.info('FREQUENCY_CODE_COMMIT_AVG_ESB_QUERY', prCommentAvgQuery);
    const data = await esClientObj.getClient().search({
      index: Github.Enums.IndexName.GitCommits,
      body: prCommentAvgQuery,
    });
    const totalDoc = data.body.hits.total.value;
    const weekDaysCount = getWeekDaysCount(startDate, endDate);
    return { value: totalDoc / weekDaysCount };
  } catch (e) {
    logger.error('frequencyOfCodeCommitGraphAvg.error', e);
    throw e;
  }
}
