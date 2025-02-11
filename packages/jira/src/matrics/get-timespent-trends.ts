import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { createSprintQuery, getDateRangeQueries } from './get-sprint-variance';
import { searchedDataFormator } from 'src/util/response-formatter';
import { processCategorizedTimeSpent } from './get-timespent-tabular-view';

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

interface TimeSpentResponse {
    trendsData: TimeSpentEntry[];
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