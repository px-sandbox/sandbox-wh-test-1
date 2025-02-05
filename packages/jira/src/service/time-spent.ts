/* eslint-disable max-lines-per-function */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getTotalTimeSpent } from 'src/matrics/get-timespent-sprints';

const timeSpent = async function timeSpent(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const requestId = event?.requestContext?.requestId;
    const projectId: string = event.queryStringParameters?.projectId || '';
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    console.log("projectId, startDate, endDate)", projectId, startDate, endDate);
    try {
        const totalTime = await getTotalTimeSpent(
            projectId,
            startDate,
            endDate,
            {
                requestId,
                resourceId: projectId,
            },
        );
        return responseParser
            .setBody({
                totalTime,
            })
            .setMessage('time spent headline fetched successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error({
            requestId,
            resourceId: projectId,
            message: 'time spent headline fetch error',
            error: `${e}`,
        });
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = timeSpent;
export { handler, timeSpent };
