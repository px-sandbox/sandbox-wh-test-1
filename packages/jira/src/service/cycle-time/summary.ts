import { transpileSchema } from '@middy/validator/transpile';
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, responseParser } from 'core';
import { fetchSprintsFromESWithOtherInfo } from '../../matrics/cycle-time/overall';
import { overallSummary, sprintLevelSummaryCalc } from '../../matrics/cycle-time/summary';
import { CycleTimeSummaryValidator } from '../validations';

const summary = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  const projectId = event.queryStringParameters?.projectId ?? '';
  const orgId = event.queryStringParameters?.orgId ?? '';
  const sprintIds: string[] | undefined =
    event.queryStringParameters?.sprintIds?.split(',') || undefined;
  const type =
    (event.queryStringParameters?.type as Jira.Enums.CycleTimeSummaryType) ??
    Jira.Enums.CycleTimeSummaryType.GRAPH;

  if (!sprintIds) {
    return responseParser
      .setBody([])
      .setMessage('No sprint id in the request')
      .setResponseBodyCode('SUCCESS')
      .setStatusCode(HttpStatusCode['200'])
      .send();
  }

  const sprints = await fetchSprintsFromESWithOtherInfo(
    { requestId, resourceId: projectId },
    projectId,
    sprintIds,
    orgId
  );
  const sprintLevelSummary = await sprintLevelSummaryCalc(sprints, orgId);

  if (type === Jira.Enums.CycleTimeSummaryType.TABLE && sprintLevelSummary) {
    const response = overallSummary(sprintLevelSummary);
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
