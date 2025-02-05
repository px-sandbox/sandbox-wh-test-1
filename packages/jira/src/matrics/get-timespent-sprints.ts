import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../util/response-formatter';
import { getDateRangeQueries, createSprintQuery } from './get-sprint-variance';

const esClientObj = ElasticSearchClient.getInstance();

async function totalTimeSpent(
    sprintIdsArr: string[],
    reqCtx: Other.Type.RequestCtx
): Promise<{
    totalTime: { value: number };
}> {
    const query = esb
        .requestBodySearch()
        .size(0)
        .agg(esb.sumAggregation('totalTime', 'body.timeLogged'))
        .query(esb.boolQuery().must([esb.termsQuery('body.sprintId', sprintIdsArr)]))
        .toJSON();
    logger.info({ ...reqCtx, message: 'totalTimeSpent for sprints', data: { query } });

    return esClientObj.queryAggs(Jira.Enums.IndexName.Worklog, query);
}

export async function getTotalTimeSpent(
    projectId: string,
    startDate: string,
    endDate: string,
    reqCtx: Other.Type.RequestCtx,
): Promise<number> {
    const sprintIdsArr = [];
    try {
        const dateRangeQueries = getDateRangeQueries(startDate, endDate);
        const sprintQuery = createSprintQuery(projectId, dateRangeQueries);

        let sprintIds = [];
        let lastHit;
        do {
            const query = sprintQuery.searchAfter(lastHit);
            const body: Other.Type.HitBody = await esClientObj.search(Jira.Enums.IndexName.Sprint, query);
            lastHit = body.hits.hits[body.hits.hits.length - 1]?.sort;
            sprintIds = await searchedDataFormator(body);
            sprintIdsArr.push(...sprintIds.map((id) => id.id));
        } while (sprintIds?.length);
        logger.info({ ...reqCtx, message: 'sprintIds', data: { sprintIdsArr } });
        const totalTime = await totalTimeSpent(sprintIdsArr, reqCtx);
        return totalTime.totalTime.value;
    } catch (e) {
        throw new Error(`error_occurred_for_total_timespent_headline: ${e}`);
    }
}
