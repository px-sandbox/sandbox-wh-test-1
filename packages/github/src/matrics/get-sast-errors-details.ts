import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClientGh.getInstance();

const getAggrigatedDataSastErrors = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  afterKey?: object | undefined
): Promise<Github.Type.ISastErrorAggregationResult> => {
  let compositeAgg = esb
    .compositeAggregation('errorsBucket')
    .sources(
      esb.CompositeAggregation.termsValuesSource('errorMsg', 'body.errorMsg'),
      esb.CompositeAggregation.termsValuesSource('errorRuleId', 'body.ruleId'),
      esb.CompositeAggregation.termsValuesSource('errorFileName', 'body.fileName'),
      esb.CompositeAggregation.termsValuesSource('errorRepoId', 'body.repoId')
    );
  if (afterKey) {
    compositeAgg = compositeAgg.after(afterKey);
  }
  const matchQry = esb
    .requestBodySearch()
    .query(
      esb.boolQuery().must([
        esb.termsQuery('body.repoId', repoIds),
        // esb.termQuery('body.organizationId', orgId.id),
        esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
        esb.termsQuery('body.branch', branch),
        esb.termQuery('body.isDeleted', false),
      ])
    )
    .agg(compositeAgg)
    .toJSON();

  logger.info('searchSastErrorsMatrics.query', matchQry);
  const searchedData: Github.Type.ISastErrorAggregationResult = await esClientObj.queryAggs(
    Github.Enums.IndexName.GitRepoSastErrors,
    matchQry
  );
  return searchedData;
};
async function searchSastErrors(
  repoIds: string[],
  // orgName: string,
  startDate: string,
  endDate: string,
  branch: string[],
  afterKey?: object | undefined
): Promise<Github.Type.SastErrorReport[]> {
  let formattedData: Github.Type.SastErrorReport[] = [];
  try {
    const searchedData = await getAggrigatedDataSastErrors(
      repoIds,
      startDate,
      endDate,
      branch,
      afterKey
    );
    formattedData = searchedData?.errorsBucket?.buckets?.map((bucket) => ({
      errorMsg: bucket.key.errorMsg as string,
      errorRuleId: bucket.key.errorRuleId as string,
      errorFileName: bucket.key.errorFileName as string,
      errorRepoId: bucket.key.errorRepoId as string,
    }));

    return formattedData;
  } catch (err) {
    logger.error('searchSastErrorsMatrics.error', err);
    throw err;
  }
}

async function getRepoSastErrorsQuery(
  repoIds: string[],
  // orgName: string,
  startDate: string,
  endDate: string,
  branch: string[],
  afterKey: object | undefined
): Promise<object | undefined> {
  const data = await searchSastErrors(repoIds, startDate, endDate, branch, afterKey);
  logger.info('getRepoSastErrorsSearch.data', { length: data.length });
  if (data.length === 0) {
    return undefined;
  }

  let compositeAgg = esb
    .compositeAggregation('errorsBucket')
    .sources(
      esb.CompositeAggregation.termsValuesSource('errorMsg', 'body.errorMsg'),
      esb.CompositeAggregation.termsValuesSource('errorRuleId', 'body.ruleId'),
      esb.CompositeAggregation.termsValuesSource('errorFileName', 'body.fileName'),
      esb.CompositeAggregation.termsValuesSource('errorRepoId', 'body.repoId')
    )
    .aggs([
      esb.cardinalityAggregation('distinctBranch', 'body.branch'),
      esb.termsAggregation('distinctBranchName', 'body.branch'),
      esb.minAggregation('errorFirstOccurred', 'body.date'),
    ]);

  if (afterKey) {
    compositeAgg = compositeAgg.after(afterKey);
  }
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .should(
          data.map((error) =>
            esb
              .boolQuery()
              .must([
                esb.termsQuery('body.errorMsg', error.errorMsg),
                esb.termsQuery('body.ruleId', error.errorRuleId),
                esb.termsQuery('body.fileName', error.errorFileName),
                esb.termsQuery('body.repoId', error.errorRepoId),
              ])
          )
        )
        .minimumShouldMatch(1)
    )
    .agg(compositeAgg)
    .toJSON();

  logger.info('getRepoSastErrorsFinalMatrics.query', query);
  return query;
}

/* eslint-disable max-lines-per-function */
// Main Function
export async function getRepoSastErrors(
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  afterKeyObj?: object | undefined
): Promise<Github.Type.SastErrorsAggregationData> {
  logger.info('getRepoSastErrors.details', { repoIds, startDate, endDate, branch, afterKeyObj });
  let afterKey;
  const finalData: Github.Type.SastErrorsAggregation[] = [];
  try {
    const requestBody = await getRepoSastErrorsQuery(
      repoIds,
      startDate,
      endDate,
      branch,
      afterKeyObj
    );
    if (requestBody) {
      const report = await esClientObj.queryAggs<Github.Type.ISastErrorAggregationResult>(
        Github.Enums.IndexName.GitRepoSastErrors,
        requestBody
      );
      logger.info('getRepoSastErrorsMatrics.report', {
        report_length: report ?? '',
      });
      afterKey = report?.errorsBucket?.after_key;
      const repoNames = await getRepoNames(repoIds);
      if (report) {
        finalData.push(
          ...report.errorsBucket.buckets.map((bucket) => ({
            repoName: repoNames.find(
              (repo: Github.Type.RepoNameType) => repo.id === bucket.key.errorRepoId
            )?.name as string | '',
            errorName: bucket.key.errorMsg as string,
            ruleId: bucket.key.errorRuleId as string,
            filename: bucket.key.errorFileName as string,
            branch: bucket.distinctBranchName.buckets.map(
              (branchBucket) => branchBucket.key as string
            ),
            firstOccurredAt: bucket.errorFirstOccurred.value_as_string as string,
          }))
        );
      }
      logger.info('getRepoSastErrorsMatrics.finalData', { finalData_length: finalData?.length });

      logger.info('getRepoSastErrorsMatrics.finalData', { finalData_length: finalData?.length });
    }
    return {
      data: finalData.length > 0 ? finalData : [],
      afterKey: afterKey ? Buffer.from(JSON.stringify(afterKey), 'utf-8').toString('base64') : '',
    };
  } catch (err) {
    logger.error('getRepoSastErrorsMatrics.error', err);
    throw err;
  }
}

/* eslint-disable no-await-in-loop */
export async function getRepoNames(repoIds: string[]): Promise<Github.Type.RepoNameType[]> {
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

      repoNames = await searchedDataFormator(repoNamesData.body);

      if (repoNames?.length) {
        repoNamesArr.push(...repoNames);
        counter2 += 1;
      }
    } while (repoNames?.length);
  } catch (err) {
    logger.error('getSastErrorDetails.getRepoNames.error', err);
    throw err;
  }
  return repoNamesArr;
}
