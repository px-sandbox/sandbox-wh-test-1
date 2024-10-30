import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import { getTestCoverageHeadlineData } from 'src/matrics/get-test-coverage-headline';

export const getTestCoverage = async function getTestData(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const { requestId } = event.requestContext;
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [];
    const todaysDate: string = new Date().toISOString().split('T')[0];

    const response = await getTestCoverageHeadlineData(repoIds, todaysDate);
    return responseParser
      .setBody(response)
      .setMessage('getTestCoverageHeadline.retrieved')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    return responseParser
      .setBody(`${e}`)
      .setMessage('getTestCoverageHeadline.error')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('FAILED')
      .send();
  }
};
export const handler = getTestCoverage;
