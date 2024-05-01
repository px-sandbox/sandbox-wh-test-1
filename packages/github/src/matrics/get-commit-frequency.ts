import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';
import { getWeekDaysCount } from '../util/weekend-calculations';

const esClientObj = ElasticSearchClient.getInstance();

const getGraphDataQuery = (
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
):object => {
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
  return frquencyOfCodeCommitGraphQuery;
}; 
const getHeadlineQuery = (startDate: string, endDate: string, repoIds: string[]):object => {
  const query  = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
          esb.termsQuery('body.isMergedCommit', 'false'),
        ])
    )
    .toJSON();
  logger.info('FREQUENCY_CODE_COMMIT_AVG_ESB_QUERY', query);
  return query;
};
export async function frequencyOfCodeCommitGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<GraphResponse[]> {
  try { 
    const frquencyOfCodeCommitGraphQuery = getGraphDataQuery( startDate, endDate, intervals, repoIds);  
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
    const query = await getHeadlineQuery(startDate, endDate, repoIds);
    const data:HitBody = await esClientObj.search(
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
