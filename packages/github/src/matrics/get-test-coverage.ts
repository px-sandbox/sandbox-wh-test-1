import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';
import { paginate } from 'src/util/version-upgrades';

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
  page: string,
  limit: string,
  requestId: string
): Promise<{ repoId: number; repoName: string; value: number; date: string }[]> => {
  try {
    let counter = 1;
    let repoNamesArr: Github.Type.RepoNameType[] = [];
    let repoNames;
    const query = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.rangeQuery('body.forDate').gte(startDate).lte(endDate),
          ])
      );

    logger.info({
      message: 'testCoverage.tabular.getData.query',
      data: JSON.stringify(query.toJSON()),
      requestId,
    });
    const esResponse = await esClientObj.search(
      Github.Enums.IndexName.GitTestCoverage,
      query.toJSON()
    );

    do {
      repoNames = await getRepoName(repoIds, counter);
      if (repoNames?.length) {
        repoNamesArr.push(...repoNames);
        counter += 1;
      }
    } while (repoNames?.length);

    const repoNamesObj: { [key: string]: string } = {};
    repoNamesArr.forEach((names) => {
      repoNamesObj[names.id] = names.name;
    });
    const response = await searchedDataFormator(esResponse);
    const data = await paginate<{
      repoId: number;
      lines: { pct: number };
      forDate: string;
    }>(response, Number(page), Number(limit));

    return data.map((item) => ({
      repoId: item.repoId,
      value: item.lines.pct,
      date: item.forDate,
      repoName: repoNamesObj[item.repoId],
    }));
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};
