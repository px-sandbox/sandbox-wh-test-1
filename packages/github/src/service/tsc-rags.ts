import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { getTscRagsDetails } from '../matrics/get-tsc-rags-details';

export const handler = async function tscRagsDetails(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
  // const metricCategories: string[] = event.queryStringParameters?.categories?.split(',') || [];

  // TODO: only product_security for now
  const data = await getTscRagsDetails(repoIds);

  return responseParser
    .setBody(data)
    .setMessage('get tsc rags details')
    .setStatusCode(HttpStatusCode[200])
    .send();
};
