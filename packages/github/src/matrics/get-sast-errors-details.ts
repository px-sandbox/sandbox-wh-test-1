import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { formatRepoSastData, searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

/* eslint-disable no-await-in-loop */
export async function getRepoNames(
  repoIds: string[],
  requestId: string
): Promise<Github.Type.RepoNameType[]> {
  const repoNamesArr: Github.Type.RepoNameType[] = []; // array to store repoNames data
  let counter2 = 1; // counter for the loop to fetch data from elastic search
  let repoNames; // variable to store fetched-formatted-data from elastic search inside loop

  // we will fetch data from elastic search continuously, until we get empty array, to get all records
  try {
    do {
      const repoNamesQuery = esb
        .requestBodySearch()
        .size(100)
        .from(100 * (counter2 - 1))
        .query(
          esb
            .boolQuery()
            .should([esb.termsQuery('body.repoId', repoIds), esb.termsQuery('body.id', repoIds)])
            .minimumShouldMatch(1)
        )
        .toJSON();
      const repoNamesData = await esClientObj.search(
        Github.Enums.IndexName.GitRepo,
        repoNamesQuery
      );

      repoNames = await searchedDataFormator(repoNamesData);

      if (repoNames?.length) {
        repoNamesArr.push(...repoNames);
        counter2 += 1;
      }
    } while (repoNames?.length);
  } catch (err) {
    logger.error({ message: 'getSastErrorDetails.getRepoNames.error', error: err, requestId });
    throw err;
  }
  return repoNamesArr;
}

async function getRepoSastErrorsFromEsb(
  repoId: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  afterKeyObj?: string[]
): Promise<{ formattedSastData: Github.Type.RepoSastErrors[]; newAfterKeyObj: string }> {
  let newAfterKeyObj = '';
  const sastDetailedQuery = esb
    .requestBodySearch()
    .query(
      esb.boolQuery().must([
        esb.termsQuery('body.repoId', [...repoId]),
        esb
          .nestedQuery()
          .path('body.metadata')
          .query(
            esb
              .boolQuery()
              .must([
                esb.rangeQuery('body.metadata.lastReportedOn').gte(startDate).lte(endDate),
                esb.termsQuery('body.metadata.branch', [...branch]),
              ])
          ),
      ])
    )
    .sort(esb.sort('body.metadata.firstReportedOn', 'asc').nestedPath('body.metadata'));
  if (afterKeyObj) {
    sastDetailedQuery.searchAfter(afterKeyObj);
  }
  const finalQuery = sastDetailedQuery.toJSON();
  const report = await esClientObj.search(Github.Enums.IndexName.GitRepoSastErrors, finalQuery);

  const formattedSastData = await formatRepoSastData(report);
  // If there are more records, call the function recursively with the new afterKeyObj
  if (report.hits && report.hits.hits.length > 0) {
    const lastElement = report.hits.hits[report.hits.hits.length - 1];
    newAfterKeyObj = lastElement.sort;
  }
  return { formattedSastData, newAfterKeyObj };
}
/* eslint-disable max-lines-per-function */
// Main Function
export async function getRepoSastErrors(
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  requestId: string,
  afterKeyObj?: string[]
): Promise<Github.Type.SastErrorsAggregationData> {
  logger.info({
    message: 'getRepoSastErrors.details',
    data: { repoIds, startDate, endDate, branch, afterKeyObj },
    requestId,
  });
  let afterKey = '';
  let finalData: Github.Type.SastErrorsAggregation[] = [];
  try {
    const sastData = await getRepoSastErrorsFromEsb(
      repoIds,
      startDate,
      endDate,
      branch,
      afterKeyObj
    );
    if (sastData) {
      logger.info({
        message: 'getRepoSastErrorsMatrics.report',
        data: {
          report_length: sastData ?? '',
        },
      });
      afterKey = sastData.newAfterKeyObj;
      const repoNames = await getRepoNames(repoIds, requestId);

      if (sastData) {
        finalData = sastData.formattedSastData.map((data: Github.Type.RepoSastErrors) => {
          // Get the first occurrence date from the metadata
          const firstOccurredAt =
            data.body.metadata.length > 0 ? data.body.metadata[0].firstReportedOn : '';

          // Extract branch names as an array of strings
          const branchNames = data.body.metadata.map((meta: { branch: string }) => meta.branch);

          return {
            repoName:
              (repoNames.find((repo: Github.Type.RepoNameType) => repo.id === data.body.repoId)
                ?.name as string) || '',
            errorName: data.body.errorMsg as string,
            ruleId: data.body.ruleId as string,
            filename: data.body.fileName as string,
            branch: branchNames,
            firstOccurredAt,
          };
        });
      }
      logger.info({
        message: 'getRepoSastErrorsMatrics.finalData',
        data: { finalData_length: finalData?.length },
        requestId,
      });
    }
    return {
      data: finalData.length > 0 ? finalData : [],
      afterKey: afterKey ? Buffer.from(JSON.stringify(afterKey), 'utf-8').toString('base64') : '',
    };
  } catch (err) {
    logger.error({ message: 'getRepoSastErrorsMatrics.error', error: `${err}`, requestId });
    throw err;
  }
}
