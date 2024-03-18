import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esbDateHistogramInterval } from '../constant/config';
import { getWeekDaysCount } from '../util/weekend-calculations';
import { searchedDataFormator } from 'src/util/response-formatter';
import { HitBody } from 'abstraction/other/type';

function processGraphInterval(
  intervals: string,
  startDate: string,
  endDate: string
): esb.DateHistogramAggregation {
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
  return graphIntervals;
}
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

    const graphIntervals = processGraphInterval(intervals, startDate, endDate);

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
    const { query } = esb.requestBodySearch().size(0)
      .query(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.repoId', repoIds),
            esb.termsQuery('body.isMergedCommit', 'false'),
          ])
      )
      .toJSON() as { query: object };;
    logger.info('FREQUENCY_CODE_COMMIT_AVG_ESB_QUERY', query);

    const data:HitBody = await esClientObj.searchWithEsb(
       Github.Enums.IndexName.GitCommits,
      query
    );
      
    const totalDoc = data.hits.total.value;
    const weekDaysCount = getWeekDaysCount(startDate, endDate);
    return { value: parseFloat((totalDoc / weekDaysCount).toFixed(2)) };
  } catch (e) {
    logger.error('frequencyOfCodeCommitGraphAvg.error', e);
    throw e;
  }
}
