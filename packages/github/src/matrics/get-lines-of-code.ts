import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb, { Query, Script } from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';
import { getWeekDaysCount } from '../util/weekend-calculations';

const esClientObj = ElasticSearchClientGh.getInstance();

const sumScript = new Script().inline(`def files = params._source.body.changes;
            if (files.size()>0){
              def changesValue = 0;
              for(item in files){
                if(!(item.filename =~ /w*-lock.*/)){
                  changesValue += item.changes;
                }
              }
              if (changesValue != null) {
                return changesValue;
              }}`);

const getGraphDataQuery = async (
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
):Promise<object> => {
  
  const linesOfCodeGraphQuery = esb.requestBodySearch().size(0);

  linesOfCodeGraphQuery.query(
    esb
      .boolQuery()
      .must([
        esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        esb.termsQuery('body.repoId', repoIds),
        esb.termsQuery('body.isMergedCommit', 'false'),
      ])
  );
  const graphIntervals = processGraphInterval(intervals, startDate, endDate);

  linesOfCodeGraphQuery
    .agg(
      graphIntervals
        .agg(esb.sumAggregation('file_changes_sum').script(sumScript))
        .agg(esb.cardinalityAggregation('authorId', 'body.authorId'))
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
  return linesOfCodeGraphQuery;
};
const getHeadlineQuery = async (startDate: string,endDate:string, repoIds:string[]):Promise<object> => {
  const query = esb
    .requestBodySearch()
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
    .agg(esb.cardinalityAggregation('authorId', 'body.authorId'))
    .size(0)
    .toJSON();
  logger.info('LINES_OF_CODE_AVG_ESB_QUERY', Query);
  return query;
};

export async function linesOfCodeGraph(
  startDate: string,
  endDate: string,
  intervals: string,
  repoIds: string[]
): Promise<{ date: string; value: number }[]> {
  try {
    const linesOfCodeGraphQuery = await getGraphDataQuery(startDate, endDate, intervals, repoIds);
    const data: IPrCommentAggregationResponse =
      await esClientObj.queryAggs<IPrCommentAggregationResponse>(
        Github.Enums.IndexName.GitCommits,
        linesOfCodeGraphQuery
      );
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
    const query = await getHeadlineQuery(startDate, endDate, repoIds);
    const data: HitBody = await esClientObj.queryAggs(Github.Enums.IndexName.GitCommits, query);
    const totalChanges = Number(data.file_changes_sum.value);
    const totalAuthor = Number(data.authorId.value);
    const weekDaysCount = getWeekDaysCount(startDate, endDate);
    const totalPerAuthor = totalChanges === 0 ? 0 : totalChanges / totalAuthor;
    return { value: parseFloat((totalPerAuthor / weekDaysCount).toFixed(2)) };
  } catch (e) {
    logger.error('linesOfCodeGraphAvg.error', e);
    throw e;
  }
}
