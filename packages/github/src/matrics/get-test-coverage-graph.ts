import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { IPrCommentAggregationResponse } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from 'src/util/process-graph-intervals';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
const getRepoName = async (
  repoIds: string[],
  counter2: number
): Promise<Github.Type.RepoNameType[]> => {
  const repoNamesQuery = esb
    .requestBodySearch()
    .from(100 * (counter2 - 1))
    .size(100)
    .query(
      esb
        .boolQuery()
        .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
        .minimumShouldMatch(1)
    )
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
): Promise<{ date: string; value: object }[]> => {
  try {
    let repoNamesArr: Github.Type.RepoNameType[] = [];
    let repoNames: Github.Type.RepoNameType[] = [];
    let counter = 1;
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
    do {
      repoNames = await getRepoName(repoIds, counter);
      if (repoNames?.length) {
        repoNamesArr.push(...repoNames);
        counter += 1;
      }
    } while (repoNames?.length);
    const data = await esClientObj.queryAggs<IPrCommentAggregationResponse>(
      Github.Enums.IndexName.GitTestCoverage,
      testCoverageGraph.toJSON()
    );

    return data.commentsPerDay.buckets.map((bucket: any) => {
      return {
        date: bucket.key_as_string,
        value: bucket.by_repo.buckets.map((repo: any) => {
          const repoName = repoNamesArr.find((repoName) => repoName.id === repo.key);
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
