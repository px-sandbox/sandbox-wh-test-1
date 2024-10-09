import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from 'src/util/process-graph-intervals';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const getRepoName = async (repoIds: string[]): Promise<Github.Type.RepoNameType[]> => {
  const repoNamesQuery = esb
    .requestBodySearch()
    .size(repoIds.length)
    .query(esb.boolQuery().must(esb.termsQuery('body.id', repoIds)))
    .toJSON();
  const repoNamesData = await esClientObj.search(Github.Enums.IndexName.GitRepo, repoNamesQuery);
  const repoNames = await searchedDataFormator(repoNamesData);
  return repoNames;
};
export const getData = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  interval: string
): Promise<{ date: string; values: object }[]> => {
  try {
    const testCoverageGraph = esb.requestBodySearch().size(0);
    testCoverageGraph.query(esb.boolQuery().must([esb.termsQuery('body.repoId', repoIds)]));
    const graphIntervals = processGraphInterval(interval, startDate, endDate);
    testCoverageGraph.agg(
      graphIntervals.agg(
        esb
          .termsAggregation('by_repo', 'body.repoId')
          .agg(esb.avgAggregation('total_lines', 'body.lines.pct'))
      )
    );
    const repoNames = await getRepoName(repoIds);

    const data = await esClientObj.queryAggs<IPrCommentAggregationResponse>(
      Github.Enums.IndexName.GitTestCoverage,
      testCoverageGraph.toJSON()
    );

    return data.commentsPerDay.buckets.map((bucket: any) => {
      return {
        date: bucket.key_as_string,
        values: bucket.by_repo.buckets.map((repo: any) => {
          const repoName = repoNames.find((repoName) => repoName.id === repo.key);
          return {
            repoId: repo.key,
            repoName: repoName?.name,
            value: parseInt(repo.total_lines.value).toFixed(2),
          };
        }),
      };
    });
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
