/* eslint-disable max-lines-per-function */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getTimeSpentTabularData } from 'src/matrics/get-timespent-tabular-view';

const timeSpent = async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const requestId = event?.requestContext?.requestId;
    const projectId: string = event.queryStringParameters?.projectId || '';
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const page: number = parseInt(event.queryStringParameters?.page || '1', 10);
  const limit: number = parseInt(event.queryStringParameters?.limit || '10', 10);
    try {
        const timeSpentTabularData = await getTimeSpentTabularData(
            projectId,
            startDate,
            endDate,
            page,
            limit,
            {
                requestId,
                resourceId: projectId,
            },
        );
        return responseParser
            .setBody({
                timeSpentTabularData,
            })
            .setMessage('time spent tabular data fetched successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error({
            requestId,
            resourceId: projectId,
            message: 'time spent tabular data fetch error',
            error: `${e}`,
        });
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = timeSpent;
export { handler, timeSpent };
