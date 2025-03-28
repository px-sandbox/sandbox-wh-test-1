/* eslint-disable no-await-in-loop */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { SprintMapping, VersionMapping } from 'abstraction/jira/enums/sprints';
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
  sprintId: string[],
  orgId: string
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const sprintsQuery = esb
    .requestBodySearch()
    .source(['body.id', 'body.state', 'body.name', 'body.startDate', 'body.endDate'])
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId.keyword', orgId),
          esb.termsQuery('body.state', [Jira.Enums.State.ACTIVE, Jira.Enums.State.CLOSED]),
          esb.termsQuery('body.id', [...sprintId]),
        ])
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();
  const res = await esClientObj.search(Jira.Enums.IndexName.Sprint, sprintsQuery);
  return searchedDataFormator(res);
}

async function fetchVersions(
  projectId: string,
  versionIds: string[],
  orgId: string
): Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]> {
  const versionsQuery = esb
    .requestBodySearch()
    .source(['body.id', 'body.name', 'body.startDate', 'body.releaseDate', 'body.status'])
    .size(1000)
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.projectId', projectId),
          esb.termQuery('body.organizationId', orgId),
          esb.termsQuery('body.status', [Jira.Enums.State.RELEASED, Jira.Enums.State.UNRELEASED]),
          esb.termsQuery('body.id', [...versionIds]),
        ])
    )
    .sort(esb.sort('body.startDate', 'desc'))
    .toJSON();
  return searchedDataFormator(
    await esClientObj.search(Jira.Enums.IndexName.Version, versionsQuery)
  );
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
export async function fetchSprintOrVersionIds(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  sprintIds?: string[],
  versionIds?: string[]
): Promise<string[]> {
  logger.info({
    message: 'Fetching sprints from ES for project',
    data: { projectId, sprintIds, versionIds },
    ...reqCtx,
  });
  if (sprintIds && sprintIds.length > 0) {
    const sprints = await fetchSprints(projectId, sprintIds, orgId);
    if (!sprints?.length) return [];
    return sprints.map((sprint) => sprint.id);
  }
  if (versionIds && versionIds.length > 0) {
    const versions = await fetchVersions(projectId, versionIds, orgId);
    if (!versions?.length) return [];
    return versions.map((version) => version.id);
  }
  return [];
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
export async function fetchSprintsOrVersions(
  projectId: string,
  orgId: string,
  reqCtx: Other.Type.RequestCtx,
  sprintIds?: string[],
  versionIds?: string[]
): Promise<SprintMapping[] | VersionMapping[]> {
  logger.info({
    message: 'Fetching sprints or versions from ES for project',
    data: { projectId, sprintIds, versionIds },
    ...reqCtx,
  });
  if (sprintIds && sprintIds.length > 0) {
    const sprints = await fetchSprints(projectId, sprintIds, orgId);
    return sprints.map((sprint) => ({
      sprintId: sprint.id,
      name: sprint.name,
      status: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
    }));
  }
  if (versionIds && versionIds.length > 0) {
    const versions = await fetchVersions(projectId, versionIds, orgId);
    return versions.map((version) => ({
      versionId: version.id,
      name: version.name,
      status: version.status,
      startDate: version.startDate,
      releaseDate: version.releaseDate,
    }));
  }
  return [];
}
/**
 * Returns the Elasticsearch query for calculating cycle time.
 * @param sprints - An array of sprint IDs.
 * @param orgId - The organization ID.
 * @returns The Elasticsearch RequestBodySearch object.
 */
function getCycleTimeQuery(
  type: Jira.Enums.JiraFilterType,
  orgId: string,
  ids: string[]
): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termsQuery('body.sprintId', ids)
            : esb.termsQuery('body.fixVersion', ids),
          esb.termQuery('body.organizationId', orgId),
          esb.termQuery('body.isDeleted', false),
        ])
    )
    .agg(
      type === Jira.Enums.JiraFilterType.SPRINT
        ? esb
            .termsAggregation('sprints', 'body.sprintId')
            .agg(esb.sumAggregation('total_development', 'body.development.total'))
            .agg(esb.sumAggregation('total_qa', 'body.qa.total'))
            .agg(esb.sumAggregation('total_deployment', 'body.deployment.total'))
        : esb
            .termsAggregation('versions', 'body.fixVersion')
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
  orgId: string,
  ids: string[],
  isSprint: boolean
): Promise<number> {
  let cycleTimeQuery: esb.RequestBodySearch = esb.requestBodySearch();
  if (isSprint) {
    cycleTimeQuery = getCycleTimeQuery(Jira.Enums.JiraFilterType.SPRINT, orgId, ids);
  } else {
    cycleTimeQuery = getCycleTimeQuery(Jira.Enums.JiraFilterType.VERSION, orgId, ids);
  }

  const result = await esClientObj.queryAggs<Jira.Type.CycleTimeAggregationResult>(
    Jira.Enums.IndexName.CycleTime,
    cycleTimeQuery.toJSON()
  );

  let overallTime = 0;

  if (result?.sprints?.buckets) {
    for (const bucket of result.sprints.buckets) {
      const totalTime =
        bucket.total_development.value + bucket.total_qa.value + bucket.total_deployment.value;
      overallTime += totalTime / bucket.doc_count;
    }
  } else if (result?.versions?.buckets) {
    for (const bucket of result.versions.buckets) {
      const totalTime =
        bucket.total_development.value + bucket.total_qa.value + bucket.total_deployment.value;
      overallTime += totalTime / bucket.doc_count;
    }
  }

  return overallTime ? parseFloat((overallTime / ids.length).toFixed(2)) : 0;
}
