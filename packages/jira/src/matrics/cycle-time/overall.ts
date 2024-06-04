/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();

/**
 * Fetches the sprints based on the provided parameters.
 *
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the sprints.
 * @param endDate - The end date of the sprints.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an array of sprints.
 */
async function fetchSprints(
  projectId: string,
  startDate: string,
  endDate: string,
  orgId: string
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const sprintsQuery = esb
    .requestBodySearch()
    .source(['body.id', 'body.state', 'body.name', 'body.startDate', 'body.endDate'])
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId', orgId),
          esb.termsQuery('body.state', [
            Jira.Enums.SprintState.ACTIVE,
            Jira.Enums.SprintState.CLOSED,
          ]),
        ])
        .should([
          esb.rangeQuery('body.startDate').gte(startDate).lte(endDate),
          esb.rangeQuery('body.endDate').gte(startDate).lte(endDate),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  return searchedDataFormator(await esClientObj.search(Jira.Enums.IndexName.Sprint, sprintsQuery));
}
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
  const sprints = await fetchSprints(projectId, startDate, endDate, orgId);
  return sprints.map((sprint) => sprint.id);
}
/**
 * Fetches sprints from Elasticsearch with their status.
 *
 * @param reqCtx - The request context.
 * @param projectId - The ID of the project.
 * @param startDate - The start date of the sprints.
 * @param endDate - The end date of the sprints.
 * @param orgId - The ID of the organization.
 * @returns A promise that resolves to an array of objects containing the sprint ID and status.
 */
export async function fetchSprintsFromESWithOtherInfo(
  reqCtx: Other.Type.RequestCtx,
  projectId: string,
  startDate: string,
  endDate: string,
  orgId: string
): Promise<
  {
    sprintId: string;
    status: Jira.Enums.SprintState;
    name: string;
    startDate: string;
    endDate: string;
  }[]
> {
  const sprints = await fetchSprints(projectId, startDate, endDate, orgId);
  return sprints.map((sprint) => ({
    sprintId: sprint.id,
    name: sprint.name,
    status: sprint.state,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
  }));
}

/**
 * Returns the Elasticsearch query for calculating cycle time.
 * @param sprints - An array of sprint IDs.
 * @param orgId - The organization ID.
 * @returns The Elasticsearch RequestBodySearch object.
 */
function getCycleTimeQuery(sprints: string[], orgId: string): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprints),
          esb.termQuery('body.organizationId', orgId),
        ])
    )
    .agg(
      esb
        .termsAggregation('sprints', 'body.sprintId')
        .agg(esb.sumAggregation('total_development', 'body.development.total'))
        .agg(esb.sumAggregation('total_qa', 'body.qa.total'))
        .agg(esb.sumAggregation('total_deployment', 'body.deployment.total'))
    );
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
  const cycleTimeQuery = getCycleTimeQuery(sprints, orgId);

  const result = await esClientObj.queryAggs<Jira.Type.CycleTimeAggregationResult>(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery.toJSON()
  );

  let overallTime = 0;
  let sprintCount = 0;

  if (result?.sprints?.buckets) {
    for (const bucket of result.sprints.buckets) {
      const totalTime =
        bucket.total_development.value + bucket.total_qa.value + bucket.total_deployment.value;
      overallTime += totalTime / bucket.doc_count;
      sprintCount += 1;
    }
  }

  return overallTime / sprintCount ?? 0;
}
