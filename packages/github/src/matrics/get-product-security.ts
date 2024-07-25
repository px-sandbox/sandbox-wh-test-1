import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { HitBody } from 'abstraction/other/type';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { esbDateHistogramInterval } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

// initializing elastic search client
const esClientObj = ElasticSearchClient.getInstance();

const getAggrigatedProductSecurityData = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  branch: string,
  graphInterval: esb.DateHistogramAggregation
): Promise<Github.Type.ProdSecurityAgg> => {
  // query for fetching and aggregating records based on branch and date range
  const query = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .filter(esb.termsQuery('body.repoId', repoIds))
        .filter(esb.termQuery('body.branch', branch))
        .filter(esb.rangeQuery('body.date').gte(startDate).lte(endDate).format('yyyy-MM-dd'))
    )
    .agg(graphInterval.agg(esb.sumAggregation('totalErrorCount', 'body.count')));

  const data = await esClientObj.queryAggs<Github.Type.ProdSecurityAgg>(
    Github.Enums.IndexName.GitRepoSastErrorsCount,
    query.toJSON()
  );
  return data;
};

const getHeadline = async (repoIds: string[], branch: string): Promise<HitBody> => {
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.isDeleted', false),
          esb.termsQuery('body.repoId', repoIds),
          esb.termQuery('body.branch', branch),
          esb.termQuery('body.date', moment().format('YYYY-MM-DD')),
        ])
    );

  const data: HitBody = await esClientObj.search(
    Github.Enums.IndexName.GitRepoSastErrors,
    query.toJSON()
  );
  return data;
};

const getWeeklyHeadline = async (
  branch: { repoId: string; branch: string }[]
): Promise<HitBody> => {
  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .should(
          branch.map((branchData) =>
            esb
              .boolQuery()
              .must([
                esb.termQuery('body.branch', branchData.branch),
                esb.termQuery('body.repoId', branchData.repoId),
              ])
          )
        )
        .minimumShouldMatch(1)
        .must([
          esb.termQuery('body.isDeleted', false),
          esb.termQuery('body.date', moment().format('YYYY-MM-DD')),
        ])
    )
    .toJSON();
  const data = await esClientObj.search(Github.Enums.IndexName.GitRepoSastErrors, query);
  const formattedData = await searchedDataFormator(data);
  return formattedData;
};

/**
 * Retrieves graph data for a specified date range, interval, and branch.
 * @param startDate The start date of the range in the format 'yyyy-MM-dd'.
 * @param endDate The end date of the range in the format 'yyyy-MM-dd'.
 * @param interval The interval for the date histogram aggregation.
 * @param branch The branch to filter the data by.
 * @returns A promise that resolves to an array of graph data objects, each containing a date and a value.
 */
async function getGraphData(
  repoIds: string[],
  startDate: string,
  endDate: string,
  interval: string,
  branch: string
): Promise<Github.Type.ProdSecurityGraphData[]> {
  let graphInterval: esb.DateHistogramAggregation;

  // setting up graph interval query to fetch aggregated records based on interval (day/month/2d/3d)
  if (interval === esbDateHistogramInterval.day || interval === esbDateHistogramInterval.month) {
    graphInterval = esb
      .dateHistogramAggregation('errorsOverTime')
      .field('body.date')
      .format('yyyy-MM-dd')
      .calendarInterval(interval)
      .extendedBounds(startDate, endDate)
      .minDocCount(0);
  } else {
    graphInterval = esb
      .dateHistogramAggregation('errorsOverTime')
      .field('body.date')
      .format('yyyy-MM-dd')
      .fixedInterval(interval)
      .extendedBounds(startDate, endDate)
      .minDocCount(0);
  }

  const data = await getAggrigatedProductSecurityData(
    repoIds,
    startDate,
    endDate,
    branch,
    graphInterval
  );
  // returning bucketed data
  return data?.errorsOverTime?.buckets?.map((item: Github.Type.ErrorsOverTimeBuckets) => ({
    date: item.key_as_string,
    value: item.totalErrorCount.value,
  }));
}

/**
 * Retrieves the headline statistic for a given branch.
 * @param branch - The branch name.
 * @returns A promise that resolves to the number of headline statistics.
 */
export async function getHeadlineStat(repoIds: string[], branch: string): Promise<number> {
  const data = await getHeadline(repoIds, branch);
  return data?.hits?.total?.value;
}

/**
 * Retrieves product security data for a given date range, interval, and branch.
 * @param startDate The start date of the date range.
 * @param endDate The end date of the date range.
 * @param interval The interval for the data (e.g., "daily", "weekly", "monthly").
 * @param branch The branch to retrieve data from.
 * @returns A promise that resolves to the product security data.
 * @throws If there is an error while fetching the data.
 */
export async function getProductSecurity(
  repoIds: string[],
  startDate: string,
  endDate: string,
  interval: string,
  branch: string,
  requestId: string
): Promise<Github.Type.ProductSecurity> {
  try {
    const [graphData, headlineStat] = await Promise.all([
      getGraphData(repoIds, startDate, endDate, interval, branch),
      getHeadlineStat(repoIds, branch),
    ]);

    return {
      headline: headlineStat ?? 0,
      graphData,
    };
  } catch (e) {
    logger.error({
      message: 'productSecurity.error: Error while fetching product security metrics',
      error: e,
      requestId,
    });
    throw e;
  }
}

export async function weeklyHeadlineStat(
  branch: { repoId: string; branch: string }[]
): Promise<number> {
  const formattedData = await getWeeklyHeadline(branch);
  return formattedData.length;
}
