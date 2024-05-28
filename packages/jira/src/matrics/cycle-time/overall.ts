/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
/**
 * Fetches sprints from Elasticsearch based on the provided parameters.
 * @param reqCtx - The request context.
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the sprints.
 * @param endDate - The end date of the sprints.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an array of sprint IDs.
 */
export async function fetchSprintsFromES(
  reqCtx: Other.Type.RequestCtx,
  projectId: string,
  startDate: string,
  endDate: string,
  orgId: string
): Promise<string[]> {
  const sprintsQuery = esb
    .requestBodySearch()
    .source(['body.id'])
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId', orgId),
        ])
        .should([
          esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
          esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  const sprints = await searchedDataFormator(
    await esClientObj.search(Jira.Enums.IndexName.Sprint, sprintsQuery)
  );
  return sprints.map((sprint) => sprint.id);
}

/**
 * Calculates the overall cycle time for a given set of sprints and organization.
 * @param reqCtx - The request context.
 * @param sprints - An array of sprint IDs.
 * @param orgId - The organization ID.
 * @returns The overall cycle time as a number.
 */
export async function calculateCycleTime(
  reqCtx: Other.Type.RequestCtx,
  sprints: string[],
  orgId: string
): Promise<number> {
  const cycleTimeQuery = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprints),
          esb.termQuery('body.organizationId', orgId),
        ])
    )
    .size(1000)
    .sort(esb.sort('_id'))
    .source(['body.issueKey', 'body.sprintId', 'body.development', 'body.qa', 'body.deployment']);

  let unformattedCycleTime: Other.Type.HitBody = await esClientObj.search(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery.toJSON()
  );
  let formattedCycleTime = await searchedDataFormator(unformattedCycleTime);
  const cycleTime = [];

  cycleTime.push(...formattedCycleTime);

  while (formattedCycleTime?.length > 0) {
    const lastHit = unformattedCycleTime?.hits?.hits[unformattedCycleTime.hits.hits.length - 1];
    const query = cycleTimeQuery.searchAfter([lastHit.sort[0]]).toJSON();
    unformattedCycleTime = await esClientObj.search(Jira.Enums.IndexName.Issue, query);
    formattedCycleTime = await searchedDataFormator(unformattedCycleTime);
    cycleTime.push(...formattedCycleTime);
  }

  // we will store total time sprint wise in key value pair in this object
  const sprintOverall: { [key: string]: { time: number; count: number } } = {};

  for (const cycle of cycleTime) {
    const { sprintId, development, qa, deployment } = cycle;
    if (!sprintOverall[sprintId]) {
      sprintOverall[sprintId] = { time: development.total + qa.total + deployment.total, count: 0 };
    } else {
      sprintOverall[sprintId] = {
        time: sprintOverall[sprintId].time + development.total + qa.total + deployment.total,
        count: sprintOverall[sprintId].count + 1,
      };
    }
  }

  // now we will calculate the average time for each sprint and then overall average time
  let overallTime = 0;

  for (const so in sprintOverall) {
    if (sprintOverall[so]) {
      overallTime += sprintOverall[so].time / sprintOverall[so].count;
    }
  }
  return overallTime / Object.keys(sprintOverall).length;
}
