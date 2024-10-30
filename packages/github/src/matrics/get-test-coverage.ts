import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import esb, { sort } from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';
import { paginate } from 'src/util/version-upgrades';

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
  page: number,
  limit: number,
  requestId: string
): Promise<{
  data: { repoId: number; repoName: string; value: number; date: string }[];
  page: number;
  totalPages: number;
}> => {
  try {
    const query = esb
      .requestBodySearch()
      .from(limit * (page - 1))
      .size(limit)
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.rangeQuery('body.forDate').gte(startDate).lte(endDate),
          ])
      )
      .sort(sort('body.forDate', 'desc'));
    const esResponse: Other.Type.HitBody = await esClientObj.search(
      Github.Enums.IndexName.GitTestCoverage,
      query.toJSON()
    );
    logger.info({
      message: 'testCoverage.tabular.getData.query',
      data: JSON.stringify(query.toJSON()),
      requestId,
    });

    const response = await searchedDataFormator(esResponse);

    logger.info({
      message: 'testCoverage.tabular.getData.query',
      data: JSON.stringify(response.length),
      requestId,
    });

    const repoNames = await getRepoName(repoIds);
    const repoNamesObj: { [key: string]: string } = {};
    repoNames.forEach((names) => {
      repoNamesObj[names.id] = names.name;
    });

    const res = response.map(
      (item: { repoId: number; repoName: string; lines: { pct: number }; forDate: string }) => ({
        repoId: item.repoId,
        value: item.lines.pct.toFixed(2),
        date: item.forDate,
        repoName: repoNamesObj[item.repoId],
      })
    );

    const totalPages = Math.ceil(esResponse.hits.total.value / limit);
    return { data: res, page, totalPages };
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
