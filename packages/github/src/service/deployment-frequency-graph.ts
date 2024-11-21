import {
  APIGatewayAuthorizerResult,
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getDeploymentFrequencyGraphData } from 'src/matrics/get-deployment-frequency-graph';

export const handler = async function deploymentFrequencyGraph(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const startDate: string = event.queryStringParameters?.startDate || '';
    const endDate: string = event.queryStringParameters?.endDate || '';
    const interval: string = event.queryStringParameters?.interval || '';
    const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];
    const destination: string[] = event.queryStringParameters?.env?.split(',') || [''];

    const graphData = await getDeploymentFrequencyGraphData(
      startDate,
      endDate,
      repoIds,
      interval,
      destination
    );

    return responseParser
      .setBody({ graphData })
      .setMessage('Deployment frequency graph data retrieved successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({ message: 'deploymentFrequencyGraph.error', error: `${error}` });
    throw new Error(`Something went wrong: ${error}`);
  }
};
