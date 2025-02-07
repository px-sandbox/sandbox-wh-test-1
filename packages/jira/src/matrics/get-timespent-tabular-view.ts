import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { getDateRangeQueries, sprintHitsResponse } from './get-sprint-variance';

const esClientObj = ElasticSearchClient.getInstance();

interface SprintData {
    id: string;
    sprintId: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
}

interface TimeSpentEntry {
    sprintdata: SprintData;
    Development: number;
    QA: number;
    Meetings: number;
    Bugs: number;
    Others: number;
}

interface TimeSpentResponse {
    totalPages: number;
    tableData: TimeSpentEntry[];
}
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
    const formattedData = response.sprint_aggregation.buckets.map((sprintData) => {
        const obj: Record<string, number> = {
            sprintId: sprintData.key,
            Development: 0,
            QA: 0,
            Meeting: 0,
            Bugs: 0,
            Others: 0,
        };
        sprintData.category_names.buckets.forEach((category: { key: string; total_time: { value: number } }) => {
            const name = category.key;
            obj[name] = category.total_time.value || 0;
        });
        return obj;
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
): Promise<TimeSpentResponse> {
    try {
        const dateRangeQueries = getDateRangeQueries(startDate, endDate);
        const { sprintHits, totalPages } = await sprintHitsResponse(
            limit,
            page,
            projectId,
            dateRangeQueries,
            reqCtx,
        );
        const sprintData: SprintData[] = [];
        const sprintIds: string[] = [];
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
        const mergedData: TimeSpentEntry[] = sprintData.map((sprintItem: SprintData) => {
            const matchedCategorizedData: Partial<TimeSpentEntry> = categorizedData.find(item => String(item.sprintId) === sprintItem.id) || {};
            return {
                sprintdata: sprintItem,
                Development: matchedCategorizedData.Development ?? 0,
                QA: matchedCategorizedData.QA ?? 0,
                Meetings: matchedCategorizedData.Meetings ?? 0,
                Bugs: matchedCategorizedData.Bugs ?? 0,
                Others: matchedCategorizedData.Others ?? 0,
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