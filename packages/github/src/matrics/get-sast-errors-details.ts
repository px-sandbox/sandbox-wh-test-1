import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

const getAggrigatedDataSastErrors = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  requestId: string,
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

  logger.info({
    message: 'searchSastErrorsMatrics.query',
    data: JSON.stringify(matchQry),
    requestId,
  });
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
  requestId: string,
  afterKey?: object | undefined
): Promise<Github.Type.SastErrorReport[]> {
  let formattedData: Github.Type.SastErrorReport[] = [];
  try {
    const searchedData = await getAggrigatedDataSastErrors(
      repoIds,
      startDate,
      endDate,
      branch,
      requestId,
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
    logger.error({
      message: 'searchSastErrorsMatrics.error',
      data: JSON.stringify(err),
      requestId,
    });
    throw err;
  }
}

async function getRepoSastErrorsQuery(
  repoIds: string[],
  // orgName: string,
  startDate: string,
  endDate: string,
  branch: string[],
  afterKey: object | undefined,
  requestId: string
): Promise<object | undefined> {
  const data = await searchSastErrors(repoIds, startDate, endDate, branch, requestId, afterKey);
  logger.info({ message: 'getRepoSastErrorsSearch.data', data: { length: data.length } });
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

  logger.info({
    message: 'getRepoSastErrorsFinalMatrics.query',
    data: JSON.stringify(query),
    requestId,
  });
  return query;
}
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
/* eslint-disable max-lines-per-function */
// Main Function
export async function getRepoSastErrors(
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string[],
  requestId: string,
  afterKeyObj?: object | undefined
): Promise<Github.Type.SastErrorsAggregationData> {
  logger.info({
    message: 'getRepoSastErrors.details',
    data: { repoIds, startDate, endDate, branch, afterKeyObj },
    requestId,
  });
  let afterKey;
  const finalData: Github.Type.SastErrorsAggregation[] = [];
  try {
    const requestBody = await getRepoSastErrorsQuery(
      repoIds,
      startDate,
      endDate,
      branch,
      afterKeyObj,
      requestId
    );
    if (requestBody) {
      const report = await esClientObj.queryAggs<Github.Type.ISastErrorAggregationResult>(
        Github.Enums.IndexName.GitRepoSastErrors,
        requestBody
      );
      logger.info({
        message: 'getRepoSastErrorsMatrics.report',
        data: {
          report_length: report ?? '',
        },
      });
      afterKey = report?.errorsBucket?.after_key;
      const repoNames = await getRepoNames(repoIds, requestId);
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
      logger.info({
        message: 'getRepoSastErrorsMatrics.finalData',
        data: { finalData_length: finalData?.length },
        requestId,
      });

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
    logger.error({ message: 'getRepoSastErrorsMatrics.error', error: err, requestId });
    throw err;
  }
}
