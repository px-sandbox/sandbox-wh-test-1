import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getData } from 'src/matrics/get-test-coverage-graph';

export const handler = async function getTestData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const { requestId } = event.requestContext;
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const interval: string = event.queryStringParameters?.interval || '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];

    const metrics = await getData(repoIds, startDate, endDate, interval);
    return responseParser
      .setBody(metrics)
      .setMessage('getData.retrieved')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    return responseParser
      .setBody(`${e}`)
      .setMessage('getData.error')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('FAILED')
      .send();
  }
};
