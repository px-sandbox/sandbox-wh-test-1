/* eslint-disable max-lines-per-function */
import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { sprintVarianceGraph, sprintVarianceGraphAvg } from '../matrics/get-sprint-variance-v2';

const sprintVariance = async function sprintVariance(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const projectId: string = event.queryStringParameters?.projectId || '';
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const sortKey: Jira.Enums.IssueTimeTracker =
    (event.queryStringParameters?.sortKey as Jira.Enums.IssueTimeTracker) ??
    Jira.Enums.IssueTimeTracker.estimate;
  const sortOrder: 'asc' | 'desc' =
    (event.queryStringParameters?.sortOrder as 'asc' | 'desc') ?? 'desc';
  const page: number = parseInt(event.queryStringParameters?.page || '1', 10);
  const limit: number = parseInt(event.queryStringParameters?.limit || '10', 10);
  const state: Jira.Enums.State | undefined = event.queryStringParameters
    ?.state as Jira.Enums.State;
  const orgId: string = event.queryStringParameters?.organizationId || '';
  const type: string = event.queryStringParameters?.type || 'sprint';

  try {
    const [graphData, headline] = await Promise.all([
      await sprintVarianceGraph(
        projectId,
        startDate,
        endDate,
        page,
        limit,
        sortKey,
        sortOrder,
        {
          requestId,
          resourceId: projectId,
        },
        orgId,
        state,
        type
      ),
      await sprintVarianceGraphAvg(
        projectId,
        startDate,
        endDate,
        {
          requestId,
          resourceId: projectId,
        },
        type,
        state
      ),
    ]);

    return responseParser
      .setBody({
        graphData: graphData.data,
        page: graphData.page,
        totalPages: graphData.totalPages,
        headline,
      })
      .setMessage('sprint variance fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({
      requestId,
      resourceId: projectId,
      message: 'sprint variance fetch error',
      error: `${e}`,
    });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = sprintVariance;
export { handler, sprintVariance };
