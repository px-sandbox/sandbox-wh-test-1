/* eslint-disable max-lines-per-function */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getTimeSpentGraphData } from 'src/matrics/get-timespent-graph';

const timeSpentGraph = async function handler(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const requestId = event?.requestContext?.requestId;
    const projectId: string = event.queryStringParameters?.projectId || '';
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    try {
        const graphData = await getTimeSpentGraphData(
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
                graphData,
            })
            .setMessage('time spent graph data fetched successfully')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error({
            requestId,
            resourceId: projectId,
            message: 'time spent graph data fetch error',
            error: `${e}`,
        });
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = timeSpentGraph;
export { handler, timeSpentGraph };
