import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import { HitBody } from 'abstraction/other/type';
import { ElasticSearchClient } from '@pulse/elasticsearch';

const elasticsearchClient = ElasticSearchClient.getInstance();

export async function getTotalWorkbreakdown(repoIdList: string[], startDate: string, endDate: string) {
  // Build elasticsearch query with aggregations
    const query = esb.requestBodySearch()
      .query(
        esb.boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIdList),
            esb.rangeQuery('body.createdAt')
              .gte(startDate)
              .lte(endDate)
          ])
      )
      .size(0)
      .agg(
        esb.sumAggregation('newWork', 'body.workbreakdown.newFeature')
      )
      .agg(
        esb.sumAggregation('refactor', 'body.workbreakdown.refactor')
      )
      .agg(
        esb.sumAggregation('rewrite', 'body.workbreakdown.rewrite')
      )
      .toJSON();

    const searchResult: HitBody = await elasticsearchClient.search(GithubIndices.GitCommits, query);
    return searchResult;
}