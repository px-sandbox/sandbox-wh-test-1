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
    testCoverageGraph.query(
      esb
        .boolQuery()
        .must([
          esb.rangeQuery('body.forDate').gte(startDate).lte(endDate),
          esb.termsQuery('body.repoId', repoIds),
        ])
    );
    const graphIntervals = processGraphInterval(interval, startDate, endDate, 'body.forDate');
    testCoverageGraph.agg(
      graphIntervals.agg(
        esb
          .termsAggregation('by_repo', 'body.repoId')
          .agg(esb.avgAggregation('total_lines', 'body.lines.pct'))
      )
    );
    const repoNames = await getRepoName(repoIds);

    logger.info({
      message: 'getData.testCoverage.graph.info',
      data: JSON.stringify(testCoverageGraph.toJSON()),
    });
    const data = await esClientObj.queryAggs<IPrCommentAggregationResponse>(
      Github.Enums.IndexName.GitTestCoverage,
      testCoverageGraph.toJSON()
    );

    const mapping: { [key: string]: string } = {};
    const defaultObj = repoNames.reduce((acc: { [x: string]: number }, item) => {
      acc[item.name] = 0;
      mapping[item.id] = item.name;
      return acc;
    }, {});

    return data.commentsPerDay.buckets.map((bucket) => {
      return {
        date: bucket.key_as_string,
        ...defaultObj,
        ...bucket.by_repo.buckets.reduce(
          (
            acc: { [x: string]: string },
            item: { key: string | number; total_lines: { value: string } }
          ) => {
            acc[mapping[item.key]] = parseInt(item.total_lines.value).toFixed(2);
            return acc;
          },
          {}
        ),
      };
    });
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
