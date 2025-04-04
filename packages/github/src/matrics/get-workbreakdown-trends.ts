import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import { HitBody } from 'abstraction/other/type';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { logger } from 'core';
import { processGraphInterval } from '../util/process-graph-intervals';
import { esbDateHistogramInterval } from '../constant/config';

const elasticsearchClient = ElasticSearchClient.getInstance();

export async function getWorkbreakdownTrends(
  repoIdList: string[],
  startDate: string,
  endDate: string
): Promise<HitBody> {
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.repoId', repoIdList),
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        ])
    )
    .size(0);
  const graphInterval = processGraphInterval(esbDateHistogramInterval.day, startDate, endDate);
  query
    .agg(
      graphInterval.aggs([
        esb.sumAggregation('newWork', 'body.workbreakdown.newFeature'),
        esb.sumAggregation('refactor', 'body.workbreakdown.refactor'),
        esb.sumAggregation('rewrite', 'body.workbreakdown.rewrite'),
        esb
          .bucketScriptAggregation('total')
          .script('params.newWork + params.refactor + params.rewrite')
          .bucketsPath({
            newWork: 'newWork',
            refactor: 'refactor',
            rewrite: 'rewrite',
          }),
        esb
          .bucketScriptAggregation('newWorkPercentage')
          .script('params.total > 0 ? (params.newWork / params.total) * 100 : 0')
          .bucketsPath({
            newWork: 'newWork',
            total: 'total',
          }),
        esb
          .bucketScriptAggregation('refactorPercentage')
          .script('params.total > 0 ? (params.refactor / params.total) * 100 : 0')
          .bucketsPath({
            refactor: 'refactor',
            total: 'total',
          }),
        esb
          .bucketScriptAggregation('rewritePercentage')
          .script('params.total > 0 ? (params.rewrite / params.total) * 100 : 0')
          .bucketsPath({
            rewrite: 'rewrite',
            total: 'total',
          }),
      ])
    )
    .toJSON();

  logger.info({
    message: 'workbreakdownTrends.query',
    data: { query },
  });

  const searchResult: HitBody = await elasticsearchClient.search(GithubIndices.GitCommits, query);
  const res = searchResult.aggregations?.commentsPerDay?.buckets?.map(
    (bucket: {
      key_as_string: string;
      newWorkPercentage: { value: number };
      refactorPercentage: { value: number };
      rewritePercentage: { value: number };
    }) => ({
      date: bucket.key_as_string,
      newWork: parseFloat((bucket.newWorkPercentage?.value ?? 0).toFixed(2)),
      refactor: parseFloat((bucket.refactorPercentage?.value ?? 0).toFixed(2)),
      rewrite: parseFloat((bucket.rewritePercentage?.value ?? 0).toFixed(2)),
    })
  );
  return res;
}
