import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { createSprintQuery, getDateRangeQueries } from './get-sprint-variance';
import { searchedDataFormator } from 'src/util/response-formatter';

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
    Development?: number;
    QA?: number;
    Meetings?: number;
    Bugs?: number;
    Others?: number;
}
interface TimeAggregation {
    value: number;
}

interface CategoryBucket {
    key: string;
    doc_count: number;
    total_time: TimeAggregation;
}

interface CategoryAggregation {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: CategoryBucket[];
}

interface SprintBucket {
    key: string;
    doc_count: number;
    category_names: CategoryAggregation;
}

interface SprintAggregation {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: SprintBucket[];
}

interface CategorizedTimeSpentResponse {
    sprint_aggregation: SprintAggregation;
}
interface TimeSpentResponse {
    trendsData: TimeSpentEntry[];
}
async function categorizedTimeSpent(
    sprintIdsArr: string[],
    reqCtx: Other.Type.RequestCtx
): Promise<CategorizedTimeSpentResponse> {
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
            Development: 0,
            QA: 0,
            Meetings: 0,
            Bugs: 0,
            Others: 0,
        };
        sprintData.category_names.buckets.forEach((category: { key: string; total_time: { value: number } }) => {
            obj[category.key] = category.total_time.value || 0;
        });
        return {
            sprintId: sprintData.key,
            ...obj,
        };
    });
    return formattedData;
}

export async function getTimeSpentTrendsData(
    projectId: string,
    startDate: string,
    endDate: string,
    reqCtx: Other.Type.RequestCtx,
): Promise<TimeSpentResponse> {
    try {
        const dateRangeQueries = getDateRangeQueries(startDate, endDate);
        const sprintQuery = createSprintQuery(projectId, dateRangeQueries);
        let sprintIds = [];
        const sprintData: SprintData[] = [];
        const sprintIdsArr: string[] = [];
        let lastHit;
        do {
            const query = sprintQuery.searchAfter(lastHit);
            const body: Other.Type.HitBody = await esClientObj.search(Jira.Enums.IndexName.Sprint, query);
            lastHit = body.hits.hits[body.hits.hits.length - 1]?.sort;
            sprintIds = await searchedDataFormator(body);
            sprintIds.forEach((item) => {
                sprintData.push({
                    id: item.id,
                    sprintId: item.sprintId,
                    name: item.name,
                    status: item.state,
                    startDate: item.startDate,
                    endDate: item.endDate,
                });
                sprintIdsArr.push(item.id);
            });
        } while (sprintIds?.length);
        logger.info({ ...reqCtx, message: 'sprintIds', data: { sprintIdsArr } });
        const categorizedData = await processCategorizedTimeSpent(sprintIdsArr, reqCtx);
        const mergedData = sprintData.map((sprintItem: SprintData) => {
            const { sprintId, ...categorized } = categorizedData.find(item => item.sprintId === sprintItem.id) || {};
            return {
                sprintdata: sprintItem,
                ...categorized,
            };
        });
        return {
            trendsData: mergedData,
        };
    } catch (e) {
        throw new Error(`error_occurred_for_trends_timespent_data: ${e}`);
    }
}