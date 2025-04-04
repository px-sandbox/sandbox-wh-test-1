import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import { HitBody } from 'abstraction/other/type';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { logger } from 'core';

const elasticsearchClient = ElasticSearchClient.getInstance();

export async function getWorkbreakdownGraph(
  repoIdList: string[],
  startDate: string,
  endDate: string
): Promise<HitBody> {
  // Build elasticsearch query with aggregations
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
    .size(0)
    .agg(esb.sumAggregation('newWork', 'body.workbreakdown.newFeature'))
    .agg(esb.sumAggregation('refactor', 'body.workbreakdown.refactor'))
    .agg(esb.sumAggregation('rewrite', 'body.workbreakdown.rewrite'))
    .toJSON();

  logger.info({
    message: 'workbreakdownGraph.query',
    data: { query },
  });

  const searchResult: HitBody = await elasticsearchClient.queryAggs(
    GithubIndices.GitCommits,
    query
  );
  const totalWork =
    searchResult.newWork.value + searchResult.refactor.value + searchResult.rewrite.value;
  return {
    newWork: parseFloat(((searchResult.newWork.value / totalWork) * 100).toFixed(2)),
    refactor: parseFloat(((searchResult.refactor.value / totalWork) * 100).toFixed(2)),
    rework: parseFloat(((searchResult.rewrite.value / totalWork) * 100).toFixed(2)),
  };
}
