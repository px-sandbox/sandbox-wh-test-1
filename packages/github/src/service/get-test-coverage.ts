import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getData } from 'src/matrics/get-test-coverage';

const demoData = async function getTestData(): Promise<APIGatewayProxyResult> {
  try {
    const repoIds = ['123456', '1236345'];
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    const page = 1;
    const limit = 2;
    const metrics = await getData(repoIds, startDate, endDate, page, limit);
    console.log(metrics.data);
    return responseParser
      .setBody(metrics.data)
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
export const handler = demoData;
