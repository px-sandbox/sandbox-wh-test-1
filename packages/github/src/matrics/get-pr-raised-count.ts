import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';
import { getWeekDaysCount } from '../util/weekend-calculations';

const esClientObj = ElasticSearchClient.getInstance();
const getGraphQuery = (
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): object => {
  const numberOfPrRaisedGraphQuery = esb.requestBodySearch().size(0);
  numberOfPrRaisedGraphQuery.query(
    esb
      .boolQuery()
      .must([
        esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        esb.termsQuery('body.repoId', repoIds),
      ])
  );
  const graphIntervals = processGraphInterval(intervals, startDate, endDate);
  numberOfPrRaisedGraphQuery.agg(graphIntervals).toJSON();

  logger.info('NUMBER_OF_PR_RAISED_GRAPH_ESB_QUERY', numberOfPrRaisedGraphQuery);
  return numberOfPrRaisedGraphQuery;
};
const getHeadlineQuery = (startDate: string, endDate: string, repoIds: string[]):object => {
 const query = esb
   .requestBodySearch()
   .query(
     esb
       .boolQuery()
       .must([
         esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
         esb.termsQuery('body.repoId', repoIds),
       ])
   )
   .size(0)
   .toJSON() as { query: object };
  logger.info('NUMBER_OF_PR_RAISED_AVG_ESB_QUERY', query);
  return query;
};
export async function numberOfPrRaisedGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<GraphResponse[]> {
  try {
    const numberOfPrRaisedGraphQuery = getGraphQuery(startDate, endDate, intervals, repoIds); 
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitPull,
        numberOfPrRaisedGraphQuery
      );
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string,
      value: item.doc_count,
    }));
  } catch (e) {
    logger.error('numberOfPrRaisedGraph.error', e);
    throw e;
  }
}

export async function numberOfPrRaisedAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<{ value: number } | null> {
  try {
    const query = getHeadlineQuery(startDate, endDate, repoIds);
    const data:HitBody = await esClientObj.search(
      Github.Enums.IndexName.GitPull,
      query
    )
    const totalDoc = data.hits.total.value;
    const weekDaysCount = getWeekDaysCount(startDate, endDate);
    return { value: totalDoc / weekDaysCount };
  } catch (e) {
    logger.error('numberOfPrRaisedAvg.error', e);
    throw e;
  }
}
