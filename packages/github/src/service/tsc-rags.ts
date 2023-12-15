import { MetricCategories } from "abstraction/github/type";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { HttpStatusCode, responseParser } from "core";
import { getTscRagsDetails } from "src/matrics/get-tsc-rags-details";

export const handler = async function tscRagsDetails(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
    const metricCategories: string[] = event.queryStringParameters?.categories?.split(',') || [];

    const data = await getTscRagsDetails(startDate, endDate, repoIds, metricCategories as MetricCategories);

    return responseParser
        .setBody(data)
        .setMessage('get tsc rags details')
        .setStatusCode(HttpStatusCode[200])
        .send()
}