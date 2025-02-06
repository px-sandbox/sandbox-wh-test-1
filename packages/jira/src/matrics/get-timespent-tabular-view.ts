import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getDateRangeQueries, sprintHitsResponse } from './get-sprint-variance';
import { ALLOWED_TIME_SPENT_CATEGORIES } from 'src/constant/config';

const esClientObj = ElasticSearchClient.getInstance();

async function categorizedTimeSpent(
    sprintIdsArr: string[],
    reqCtx: Other.Type.RequestCtx
): Promise<{
    sprint_aggregation: { doc_count_error_upper_bound: number, sum_other_doc_count: number, buckets: any[] };
}> {
    const query = esb
        .requestBodySearch()
        .size(0)
        .aggs([
            esb
                .termsAggregation('sprint_aggregation', 'body.sprintId').size(sprintIdsArr.length)
                .aggs([
                    esb
                        .termsAggregation('category_names', 'body.category')
                        .aggs([esb.sumAggregation('total_time', 'body.timeLogged')]),
                ]),
        ])
        .query(
            esb
                .boolQuery()
                .must([
                    esb.termsQuery('body.sprintId', sprintIdsArr),
                    esb.termQuery('body.isDeleted', false),
                ])
        )
        .toJSON();
    logger.info({ ...reqCtx, message: 'categorized timeSpent for sprints', data: { query } });
    return esClientObj.queryAggs(Jira.Enums.IndexName.Worklog, query);
}

async function processCategorizedTimeSpent(
    sprintIdsArr: string[],
    reqCtx: Other.Type.RequestCtx
) {
    const response = await categorizedTimeSpent(sprintIdsArr, reqCtx);
    const sprintBuckets = response.sprint_aggregation.buckets;
    const formattedData = sprintBuckets.map((sprintBucket) => {
        const sprintId = sprintBucket.key;
        const categoryData = sprintBucket.category_names.buckets.reduce((acc: any, category: any) => {
            const categoryKey = category.key.trim();
            acc[categoryKey] = category.total_time.value || 0;
            return acc;
        }, {});
        // Ensure missing categories are set to 0
        ALLOWED_TIME_SPENT_CATEGORIES.forEach(category => {
            if (!categoryData.hasOwnProperty(category)) {
                categoryData[category] = 0;
            }
        });
        return {
            sprintId,
            ...categoryData,
        };
    });
    return formattedData;
}


export async function getTimeSpentTabularData(
    projectId: string,
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
    reqCtx: Other.Type.RequestCtx,
): Promise<any> {
    try {
        const dateRangeQueries = getDateRangeQueries(startDate, endDate);
        const { sprintHits, totalPages } = await sprintHitsResponse(
            limit,
            page,
            projectId,
            dateRangeQueries,
            reqCtx,
        );
        const sprintData: any = [];
        const sprintIds: any = [];
        // Collect sprint data and sprint IDs
        sprintHits.forEach((item: Other.Type.HitBody) => {
            sprintData.push({
                id: item.id,
                sprintId: item.sprintId,
                name: item.name,
                status: item.state,
                startDate: item.startDate,
                endDate: item.endDate,
            });
            sprintIds.push(item.id);
        });
        const categorizedData = await processCategorizedTimeSpent(sprintIds, reqCtx);
        const mergedData = sprintData.map((sprintItem: any) => {
            const { sprintId, ...categorized } = categorizedData.find(item => item.sprintId === sprintItem.id) || {};
            return {
                sprintdata: sprintItem,
                ...categorized,
            };
        });
        return {
            totalPages,
            tableData: mergedData,
        };
    } catch (e) {
        throw new Error(`error_occurred_for_tabular_timespent_data: ${e}`);
    }
}