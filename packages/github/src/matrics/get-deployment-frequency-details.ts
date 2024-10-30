import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

const getRepoName = async (repoIds: string[]): Promise<Github.Type.RepoNameType[]> => {
  const repoNamesQuery = esb
    .requestBodySearch()
    .size(repoIds.length)
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

export async function getDeploymentFrequencyDetails(
  repoIds: string[],
  env: string,
  startDate: string,
  endDate: string,
  page: number,
  limit: number
) {
  const repoNames = await getRepoName(repoIds);
  const repoNamesObj: { [key: string]: string } = {};
  repoNames.forEach((names) => {
    repoNamesObj[names.id] = names.name;
  });
  const deploymentFrequencyQuery = esb
    .requestBodySearch()
    .from((page - 1) * limit)
    .size(limit)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.repoId', repoIds),
          esb.termQuery('body.env', env),
          esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        ])
    );

  logger.info({
    message: 'Deployment Frequency Details Query',
    data: deploymentFrequencyQuery.toJSON(),
  });

  const data: any = await esClientObj.search(
    Github.Enums.IndexName.GitDeploymentFrequency,
    deploymentFrequencyQuery.toJSON()
  );

  const formattedData = await searchedDataFormator(data);

  const result = formattedData.map((doc: any) => {
    return {
      date: doc.createdAt,
      source: doc.source,
      destination: doc.destination,
      env: doc.env,
      repo: {
        id: doc.repoId,
        name: doc.repoId in repoNamesObj ? repoNamesObj[doc.repoId] : '',
      },
    };
  });

  const totalPages = Math.ceil(data.hits.total.value / limit);
  return { data: result, page, totalPages };
}
