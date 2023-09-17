import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esbDateHistogramInterval } from '../constant/config';

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
export async function prCommentsGraphData(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<{ date: string; value: number }[]> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const prCommentGraphQuery = esb.requestBodySearch().size(0);
    prCommentGraphQuery.query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
        ])
    );

    const graphIntervals = processGraphInterval(intervals, startDate, endDate);

    prCommentGraphQuery
      .agg(
        graphIntervals
          .agg(esb.valueCountAggregation('comment_count', 'body.githubPRReviewCommentId'))
          .agg(esb.cardinalityAggregation('commented_pr', 'body.pullId'))
          .agg(
            esb
              .bucketScriptAggregation('combined_avg')
              .bucketsPath({ avgComments: 'comment_count', avgDistinctPRs: 'commented_pr' })
              .gapPolicy('insert_zeros')
              .script(
                'params.avgDistinctPRs == 0 ? 0 :(params.avgComments / params.avgDistinctPRs)'
              )
          )
      )
      .toJSON();

    logger.info('PR_COMMENT_GRAPH_ESB_QUERY', prCommentGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitPRReviewComment,
        prCommentGraphQuery
      );
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string,
      value: parseFloat(item.combined_avg.value.toFixed(2)),
    }));
  } catch (e) {
    logger.error('prCommentsGraph.error', e);
    throw e;
  }
}

function getPRCommentAvgQuery(
  startDate: string,
  endDate: string,
  repoIds: string[]
): esb.RequestBodySearch {
  const prCommentAvgQuery = esb.requestBodySearch().size(0);
  prCommentAvgQuery
    .query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
        ])
    )
    .agg(
      esb
        .scriptedMetricAggregation('pr_comment_avg')
        .initScript('state.transactions = []')
        .mapScript(`state.transactions.add(doc['body.pullId.keyword'].value)`)
        .combineScript(`double comments = 0;
      Map prMap = new HashMap();
      for(t in state.transactions){
        comments += 1;
        if(prMap.get(t) == null ){
          prMap.put(t, 1);
        } else {
          prMap.put(t, prMap.get(t) + 1);
        }
      }
      Map result = new HashMap();
      result.put('comments', comments);
      result.put('prs', prMap);
      return result;`).reduceScript(` double totalComments = 0;
      Map totalPRMap = new HashMap();
    
      for(t in states){
        totalComments += t.get('comments');
        Map m = t.get('prs');
        for(pr in m.keySet()){
          if(totalPRMap.get(pr) == null){
            totalPRMap.put(pr, 1);
          }
        }
      }
      double totalPRs = totalPRMap.size();
    
      return totalPRs == 0 ? 0 : totalComments/totalPRs;`)
    )
    .toJSON();
  return prCommentAvgQuery;
}
export async function prCommentsAvg(
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<string | null> {
  try {
    const esClientObj = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const prCommentAvgQuery = getPRCommentAvgQuery(startDate, endDate, repoIds);
    logger.info('PR_COMMENT_AVG_ESB_QUERY', prCommentAvgQuery);
    const data: { pr_comment_avg: string } = await esClientObj.queryAggs<{
      pr_comment_avg: string;
    }>(Github.Enums.IndexName.GitPRReviewComment, prCommentAvgQuery);
    return data.pr_comment_avg;
  } catch (e) {
    logger.error('prCommentsAvg.error', e);
  }
  return null;
}
