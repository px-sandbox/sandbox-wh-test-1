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
    logger.info({ ...reqCtx, message: 'Raw response from categorizedTimeSpent', data: response });
    const sprintBuckets = response.sprint_aggregation.buckets;
    return sprintBuckets.map((sprintBucket) => {
        const sprintId = sprintBucket.key;
        const categoryData = sprintBucket.category_names.buckets.reduce((acc: any, category: any) => {
            const categoryKey = category.key.trim().toLowerCase();
            if (ALLOWED_TIME_SPENT_CATEGORIES.map(cat => cat.toLowerCase()).includes(categoryKey)) {
                acc[category.key] = category.total_time.value;
            } else {
                if (!acc.Others) {
                    acc.Others = 0;
                }
                acc.Others += category.total_time.value;
            }
            return acc;
        }, {});
        // Ensure "Others" is included with 0 if no time is logged
        if (!categoryData.hasOwnProperty('Others')) {
            categoryData.Others = 0;
        }
        ALLOWED_TIME_SPENT_CATEGORIES.forEach(category => {
            if (!categoryData.hasOwnProperty(category)) {
                categoryData[category] = 0;
            }
        });
        return {
            sprintId,
            totalEntries: sprintBucket.doc_count,
            ...categoryData,
        };
    });
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
        const sprintData = sprintHits.map(item => ({
            id: item.id,
            sprintId: item.sprintId,
            name: item.name,
            status: item.state,
            startDate: item.startDate,
            endDate: item.endDate,
        }));

        const sprintIds = sprintHits.map(item => item.id);
        const categorizedData = await processCategorizedTimeSpent(sprintIds, reqCtx);
        const mergedData = sprintData.map(sprintItem => {
            const categorized: Record<string, number> = categorizedData.find(item => item.sprintId === sprintItem.id) || {};
            // Ensure "Others" is explicitly set
            const result = {
                sprintdata: sprintItem,
                ...ALLOWED_TIME_SPENT_CATEGORIES.reduce((acc: any, category: any) => {
                    acc[category] = categorized[category] || 0;
                    return acc;
                }, {}),
            };
            // Ensure "Others" is included
            if (!result.hasOwnProperty('Others')) {
                result.Others = categorized.Others || 0;
            }
            return result;
        });
        return {
            totalPages,
            tableData: mergedData,
        };
    } catch (e) {
        throw new Error(`error_occurred_for_tabular_timespent_data: ${e}`);
    }
}