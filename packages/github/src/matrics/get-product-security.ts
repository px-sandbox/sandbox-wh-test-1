import { logger } from 'core';
import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import moment from 'moment';
import { esbDateHistogramInterval } from '../constant/config';
import { searchedDataFormator } from '../util/response-formatter';

// initializing elastic search client
const esClientObj = new ElasticSearchClient({
    host: Config.OPENSEARCH_NODE,
    username: Config.OPENSEARCH_USERNAME ?? '',
    password: Config.OPENSEARCH_PASSWORD ?? '',
});

/**
 * Retrieves graph data for a specified date range, interval, and branch.
 * @param startDate The start date of the range in the format 'yyyy-MM-dd'.
 * @param endDate The end date of the range in the format 'yyyy-MM-dd'.
 * @param interval The interval for the date histogram aggregation.
 * @param branch The branch to filter the data by.
 * @returns A promise that resolves to an array of graph data objects, each containing a date and a value.
 */
async function getGraphData(repoIds: string[], startDate: string, endDate: string, interval: string, branch: string):
    Promise<Github.Type.ProdSecurityGraphData[]> {

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


    // query for fetching and aggregating records based on branch and date range
    const query =
        esb.requestBodySearch().size(0).query(esb.boolQuery()
            .filter(esb.termsQuery('body.repoId', repoIds))
            .filter(esb.termQuery('body.branch', branch))
            .filter(
                esb.rangeQuery('body.date')
                    .gte(startDate)
                    .lte(endDate)
                    .format('yyyy-MM-dd')
            )).agg(
                graphInterval
            );


    const data = await
        esClientObj.queryAggs<Github.Type.ProdSecurityAgg>(Github.Enums.IndexName.GitRepoSastErrors, query.toJSON());


    // returning bucketed data
    return data?.errorsOverTime?.buckets?.map((item: Github.Type.ErrorsOverTimeBuckets) => ({
        date: item.key_as_string,
        value: item.doc_count,
    }));

}

/**
 * Retrieves the headline statistic for a given branch.
 * @param branch - The branch name.
 * @returns A promise that resolves to the number of headline statistics.
 */
async function getHeadlineStat(repoIds: string[], branch: string): Promise<number> {
    const query = esb.boolQuery()

        .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.termQuery('body.branch', branch),
            esb.termQuery('body.date', moment().format('YYYY-MM-DD'))
        ]);


    const data = await esClientObj.searchWithEsb(Github.Enums.IndexName.GitRepoSastErrors, query.toJSON());
    const formattedData = await searchedDataFormator(data);

    return formattedData.length;
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
    branch: string
): Promise<Github.Type.ProductSecurity> {
    try {

        const [graphData, headlineStat] = await Promise.all([
            getGraphData(repoIds, startDate, endDate, interval, branch),
            getHeadlineStat(repoIds, branch)
        ]);


        return {
            headline: headlineStat ?? 0,
            graphData
        }

    } catch (e) {
        logger.error('productSecurity.error: Error while fetching product security metrics', e);
        throw e;
    }
}
