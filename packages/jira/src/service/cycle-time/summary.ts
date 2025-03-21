import { transpileSchema } from '@middy/validator/transpile';
import { Jira } from 'abstraction';
import { SprintMapping, VersionMapping } from 'abstraction/jira/enums/sprints';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { fetchSprintsOrVersions } from '../../matrics/cycle-time/overall';
import {
  overallSummary,
  sprintLevelSummaryCalc,
  versionLevelSummaryCalc,
} from '../../matrics/cycle-time/summary';
import { CycleTimeSummaryValidator } from '../validations';

const summary = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const projectId = event.queryStringParameters?.projectId ?? '';
  const orgId = event.queryStringParameters?.orgId ?? '';
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [];
  const versionIds = event.queryStringParameters?.versionIds?.split(',') || [];
  const type =
    (event.queryStringParameters?.type as Jira.Enums.JiraFilterType) ??
    Jira.Enums.JiraFilterType.SPRINT;
  const view =
    (event.queryStringParameters?.view as Jira.Enums.CycleTimeSummaryType) ??
    Jira.Enums.CycleTimeSummaryType.GRAPH;

  const ids = await fetchSprintsOrVersions(
    projectId,
    orgId,
    type,
    { requestId, resourceId: projectId },
    sprintIds,
    versionIds
  );

  let sprintLevelSummary:
    | Jira.Type.CycleTimeSprintSummary[]
    | Jira.Type.CycleTimeVersionSummary[]
    | undefined;
  if (ids.length === 0) {
    return responseParser
      .setBody([])
      .setMessage('No Sprint or Version found')
      .setResponseBodyCode('SUCCESS')
      .setStatusCode(HttpStatusCode['200'])
      .send();
  }
  if (type === Jira.Enums.JiraFilterType.SPRINT) {
    sprintLevelSummary = await sprintLevelSummaryCalc(ids as SprintMapping[], orgId);
  } else {
    sprintLevelSummary = await versionLevelSummaryCalc(ids as VersionMapping[], orgId);
  }

  if (view === Jira.Enums.CycleTimeSummaryType.TABLE && sprintLevelSummary) {
    const response = overallSummary(sprintLevelSummary, { requestId, resourceId: projectId });
    return responseParser
      .setBody(response)
      .setMessage('successfully fetched overall cycle time')
      .setResponseBodyCode('SUCCESS')
      .setStatusCode(HttpStatusCode['200'])
      .send();
  }
  return responseParser
    .setBody(sprintLevelSummary)
    .setMessage('successfully fetched overall cycle time')
    .setResponseBodyCode('SUCCESS')
    .setStatusCode(HttpStatusCode['200'])
    .send();
};

export const handler = APIHandler(summary, {
  eventSchema: transpileSchema(CycleTimeSummaryValidator),
});
