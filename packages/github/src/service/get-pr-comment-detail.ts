import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { APIHandler, HttpStatusCode, logger, responseParser } from 'core';
import { prCommentsDetailMetrics } from '../matrics/get-pr-comment-detail';

const prCommentsDetail = async function getPRCommentsDetail(
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
    const requestId = event.requestContext.requestId;
    const startDate: string = event.queryStringParameters?.startDate ?? '';
    const endDate: string = event.queryStringParameters?.endDate ?? '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') ?? [];
    const page: number = event.queryStringParameters?.page ? parseInt(event.queryStringParameters?.page, 10) : 1;
    const limit: number = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters?.limit, 10) : 10;
    const sortKey = event.queryStringParameters?.sortKey ?? 'reviewComments';
    const sortOrder = event.queryStringParameters?.sortOrder ?? 'desc';
    const orgId = event.queryStringParameters?.orgId ?? '';

    try {
        const responseBody = await prCommentsDetailMetrics(
            startDate,
            endDate,
            repoIds,
            page,
            limit,
            sortKey,
            sortOrder,
            orgId,
            requestId
        );
        return responseParser
            .setBody(responseBody)
            .setMessage('PR comments detail data')
            .setStatusCode(HttpStatusCode['200'])
            .setResponseBodyCode('SUCCESS')
            .send();
    } catch (e) {
        logger.error({ message: "prCommentsDetail.error", error: e , requestId});
        throw new Error(`Something went wrong: ${e}`);
    }
};
const handler = APIHandler(prCommentsDetail);
export { handler, prCommentsDetail };
