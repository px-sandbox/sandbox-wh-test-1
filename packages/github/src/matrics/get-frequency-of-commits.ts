import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { esbDateHistogramInterval } from 'src/constant/config';
import { getWeekDaysCount } from 'src/util/weekend-calculations';
import { Config } from 'sst/node/config';

export async function frequencyOfCodeCommitGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<IPrCommentAggregationResponse | null> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const frquencyOfCodeCommitGraphQuery = await esb.requestBodySearch().size(0);
    frquencyOfCodeCommitGraphQuery.query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
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
          .calendarInterval(intervals);
        break;
      case esbDateHistogramInterval['2d']:
      case esbDateHistogramInterval['3d']:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .fixedInterval(intervals);
        break;
      default:
        graphIntervals = esb
          .dateHistogramAggregation('commentsPerDay')
          .field('body.createdAt')
          .format('yyyy-MM-dd')
          .calendarInterval(esbDateHistogramInterval.month);
    }
    frquencyOfCodeCommitGraphQuery.agg(graphIntervals).toJSON();

    logger.info('FREQUENCY_CODE_COMMIT_GRAPH_ESB_QUERY', frquencyOfCodeCommitGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitCommits,
        frquencyOfCodeCommitGraphQuery
      );
    const bucketData: any = [];
    await data.commentsPerDay.buckets.map(async (item: any): Promise<any> => {
      bucketData.push({ date: item.key_as_string, values: item.doc_count });
    });
    return bucketData;
  } catch (e) {
    logger.error('frequencyOfCodeCommitGraph.error', e);
  }
  return null;
}

export async function frequencyOfCodeCommitAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<number | {}> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const prCommentAvgQuery = await esb.requestBodySearch().size(0);
    prCommentAvgQuery
      .query(
        esb
          .boolQuery()
          .must([
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
            esb.termsQuery('body.repoId', repoIds),
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
  }
  return {};
}
