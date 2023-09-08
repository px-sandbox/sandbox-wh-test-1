import esb, { Script } from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { GraphResponse, IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { esbDateHistogramInterval } from '../constant/config';
import { getWeekDaysCount } from '../util/weekend-calculations';

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
export async function linesOfCodeGraph(
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
    const linesOfCodeGraphQuery = esb.requestBodySearch().size(0);

    linesOfCodeGraphQuery.query(
      esb.boolQuery().must([
        esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        esb.termsQuery('body.repoId', repoIds),
        // esb.termsQuery('body.isMergedCommit', 'false'),
      ])
    );
    const graphIntervals = processGraphInterval(intervals, startDate, endDate);
    const sumScript = new Script().inline(`def files = params._source.body.changes;
            if (files.size()>0){
              def changesValue = 0;
              for(item in files){
                if(!(item.filename =~ /\w*-lock./)){
                  changesValue += item.changes;
                }
              }
              if (changesValue != null) {
                return changesValue;
              }}`);
    linesOfCodeGraphQuery
      .agg(
        graphIntervals
          .agg(esb.sumAggregation('file_changes_sum').script(sumScript))
          .agg(esb.cardinalityAggregation('authorId', 'body.authorId.keyword'))
          .agg(
            esb
              .bucketScriptAggregation('combined_avg')
              .bucketsPath({ authors: 'authorId', fileChange: 'file_changes_sum' })
              .gapPolicy('insert_zeros')
              .script('params.authors == 0 ? 0 :(params.fileChange / params.authors )')
          )
      )
      .toJSON();
    logger.info('LINE_OF_CODES_GRAPH_ESB_QUERY', linesOfCodeGraphQuery);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitCommits,
        linesOfCodeGraphQuery
      );
    logger.info('LINE_OF_CODES_GRAPH_ESB_RESPONSE', data);
    return data.commentsPerDay.buckets.map((item) => ({
      date: item.key_as_string,
      value: parseFloat(item.combined_avg.value.toFixed(2)),
    }));
  } catch (e) {
    logger.error('linesOfCodeGraph.error', e);
    throw e;
  }
}

export async function linesOfCodeAvg(
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
    const sumScript = new Script().inline(`def files = params._source.body.changes;
            if (files.size()>0){
              def changesValue = 0;
              for(item in files){
                if(!(item.filename =~ /\w*-lock./)){
                  changesValue += item.changes;
                }
              }
              if (changesValue != null) {
                return changesValue;
              }}`);
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
      .agg(esb.sumAggregation('file_changes_sum').script(sumScript))
      .agg(esb.cardinalityAggregation('authorId', 'body.authorId.keyword'))
      .size(0)
      .toJSON();
    logger.info('LINES_OF_CODE_AVG_ESB_QUERY', prCommentAvgQuery);
    const data = await esClientObj.getClient().search({
      index: Github.Enums.IndexName.GitCommits,
      body: prCommentAvgQuery,
    });
    const totalChanges = Number(data.body.aggregations.file_changes_matric.value);
    const totalAuthor = Number(data.body.aggregations.authorId.value);
    console.log('totalChanges', totalChanges);
    console.log('totalAuthor', totalAuthor);
    // const weekDaysCount = getWeekDaysCount(startDate, endDate);
    // const totalPerAuthor = totalChanges / totalAuthor;
    // console.log('totalPerAuthor', totalPerAuthor);
    return { value: 0 };
  } catch (e) {
    logger.error('linesOfCodeGraphAvg.error', e);
    throw e;
  }
}
