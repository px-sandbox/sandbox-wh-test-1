import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { esbDateHistogramInterval } from 'src/constant/config';
import { getWeekDaysCount } from 'src/util/weekend-calculations';
import { Config } from 'sst/node/config';

export async function numberOfPrRaisedGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<GraphResponse[]> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const numberOfPrRaisedGraphQuery = await esb.requestBodySearch().size(0);
    numberOfPrRaisedGraphQuery.query(
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
    numberOfPrRaisedGraphQuery.agg(graphIntervals).toJSON();

    logger.info('NUMBER_OF_PR_RAISED_GRAPH_ESB_QUERY', numberOfPrRaisedGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitPull,
        numberOfPrRaisedGraphQuery
      );
    return data.commentsPerDay.buckets.map((item: any) => ({
      date: item.key_as_string,
      value: item.doc_count,
    }));
  } catch (e) {
    logger.error('numberOfPrRaisedtGraph.error', e);
    throw e;
  }
}

export async function numberOfPrRaisedtAvg(
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
    const numberOfPrRaisedAvgQuery = await esb.requestBodySearch().size(0);
    numberOfPrRaisedAvgQuery
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
    logger.info('NUMBER_OF_PR_RAISED_AVG_ESB_QUERY', numberOfPrRaisedAvgQuery);
    const data = await esClientObj.getClient().search({
      index: Github.Enums.IndexName.GitPull,
      body: numberOfPrRaisedAvgQuery,
    });
    const totalDoc = data.body.hits.total.value;
    const weekDaysCount = getWeekDaysCount(startDate, endDate);
    return { value: totalDoc / weekDaysCount };
  } catch (e) {
    logger.error('numberOfPrRaisedtAvg.error', e);
  }
  return {};
}
