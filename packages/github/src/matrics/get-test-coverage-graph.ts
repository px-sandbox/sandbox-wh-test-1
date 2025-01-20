import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { TestCoverageGraphAgg, TestCoverageLatestDoc } from 'abstraction/github/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import { processGraphInterval } from '../util/process-graph-intervals';
import { searchedDataFormator } from '../util/response-formatter';

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
): Promise<{ date: string; [key: string]: number | string }[]> => {
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
          .agg(
            esb
              .topHitsAggregation('latest_document')
              .source(['body.lines.pct'])
              .size(1)
              .sort(esb.sort('body.createdAt', 'desc'))
          )
      )
    );
    const repoNames = await getRepoName(repoIds);

    logger.info({
      message: 'getData.testCoverage.graph.info',
      data: JSON.stringify(testCoverageGraph.toJSON()),
    });
    const data = await esClientObj.queryAggs<TestCoverageGraphAgg>(
      Github.Enums.IndexName.GitTestCoverage,
      testCoverageGraph.toJSON()
    );
    const mapping: { [key: string]: string } = {};
    const defaultObj = repoNames.reduce((acc: { [x: string]: number }, item) => {
      acc[item.name] = 0;
      mapping[item.id] = item.name;
      return acc;
    }, {});

    return data.commentsPerDay.buckets.map((bucket) => ({
      date: bucket.key_as_string,
      ...defaultObj,
      ...bucket.by_repo.buckets.reduce(
        (acc: { [x: string]: number }, item: TestCoverageLatestDoc) => {
          acc[mapping[item.key]] = parseFloat(
            item.latest_document.hits.hits[0]._source.body.lines.pct
          );
          return acc;
        },
        {}
      ),
    }));
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
