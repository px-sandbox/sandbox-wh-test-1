import { Jira } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { sprintVarianceGraph, sprintVarianceGraphAvg } from 'src/matrics/get-sprint-variance';

const sprintVariance = async function sprintVariance(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const projectId: string = event.queryStringParameters?.projectId || '';
  const startDate: string = event.queryStringParameters?.startDate || '';

  const endDate: string = event.queryStringParameters?.endDate || '';
  const afterKey: string | undefined = event.queryStringParameters?.afterKey ?? '';
  const sortKey: Jira.Enums.IssueTimeTracker =
    (event.queryStringParameters?.sortKey as Jira.Enums.IssueTimeTracker) ??
    Jira.Enums.IssueTimeTracker.estimate;
  const sortOrder = event.queryStringParameters?.sortOrder ?? 'desc';

  try {
    const afterKeyObj =
      afterKey.length > 0
        ? JSON.parse(Buffer.from(afterKey, 'base64').toString('utf-8'))
        : undefined;

    const [graphData, headline] = await Promise.all([
      await sprintVarianceGraph(projectId, startDate, endDate, afterKeyObj, sortKey, sortOrder),
      await sprintVarianceGraphAvg(projectId, startDate, endDate),
    ]);
    return responseParser
      .setBody({ graphData: graphData.data, afterKey: graphData.afterKey, headline })
      .setMessage('sprint variance fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = sprintVariance;
export { handler, sprintVariance };
