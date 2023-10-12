import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { ftpRateGraph, ftpRateGraphAvg } from '../matrics/get-ftp-rate';

const ftpRate = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') ?? [''];

  try {
    const [graphData, graphAvgData] = await Promise.all([
      await ftpRateGraph(sprintIds),
      await ftpRateGraphAvg(sprintIds),
    ]);
    return responseParser
      .setBody({ graphData, headline: graphAvgData })
      .setMessage('FTP rates fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error(e);
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = ftpRate;
export { ftpRate, handler };
