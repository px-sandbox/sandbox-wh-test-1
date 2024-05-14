import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { ftpRateGraph, ftpRateGraphAvg } from '../matrics/get-ftp-rate';

const ftpRate = async function ftpRateGraphs(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const requestId = event?.requestContext?.requestId;
  const sprintIds: string[] = event.queryStringParameters?.sprintIds?.split(',') || [''];
  const { organizationId, projectId } = event.queryStringParameters as { [key: string]: string };

  try {
    const [graphData, graphAvgData] = await Promise.all([
      await ftpRateGraph(organizationId, projectId, sprintIds, {
        requestId,
        resourceId: projectId,
      }),
      await ftpRateGraphAvg(sprintIds, { requestId, resourceId: projectId }),
    ]);
    return responseParser
      .setBody({ graphData, headline: graphAvgData })
      .setMessage('FTP rates fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (e) {
    logger.error({ requestId, resourceId: projectId, message: 'FTP rates fetch error', error: e });
    throw new Error(`Something went wrong: ${e}`);
  }
};
const handler = ftpRate;
export { ftpRate, handler };
