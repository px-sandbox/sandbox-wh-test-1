import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getData } from 'src/matrics/get-test-coverage';

export const handler = async function getTestData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const { requestId } = event.requestContext;
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
    const page: string = event.queryStringParameters?.page ?? '1';
    const limit: string = event.queryStringParameters?.limit ?? '10';

    const metrics = await getData(repoIds, startDate, endDate, page, limit, requestId);

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
