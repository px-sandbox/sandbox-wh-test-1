/* eslint-disable max-lines-per-function */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getTimeSpentTrendsData } from '../matrics/get-timespent-trends';

const timeSpentTrends = async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const projectId: string = event.queryStringParameters?.projectId || '';
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  try {
    const trendsData = await getTimeSpentTrendsData(projectId, startDate, endDate, {
      requestId,
      resourceId: projectId,
    });
    return responseParser
      .setBody(trendsData)
      .setMessage('time spent trends data fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({
      requestId,
      resourceId: projectId,
      message: 'time spent trends data fetch error',
      error: `${e}`,
    });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = timeSpentTrends;
export { handler, timeSpentTrends };
