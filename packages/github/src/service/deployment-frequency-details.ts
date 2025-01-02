import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getDeploymentFrequencyDetails } from '../matrics/get-deployment-frequency-details';

export const handler = async function deploymentFrequencyDetails(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const repoIds = event.queryStringParameters?.repoIds?.split(',') || [];
    const destination = event.queryStringParameters?.env || '';
    const startDate = event.queryStringParameters?.startDate || '';
    const endDate = event.queryStringParameters?.endDate || '';
    const page = event.queryStringParameters?.page || '1';
    const limit = event.queryStringParameters?.limit || '10';

    const data = await getDeploymentFrequencyDetails(
      repoIds,
      destination,
      startDate,
      endDate,
      parseInt(page, 10),
      parseInt(limit, 10)
    );

    return responseParser
      .setBody(data)
      .setMessage('Deployment frequency details data retrieved successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({ message: 'deploymentFrequencyDetails.error', error: `${error}` });
    throw new Error(`deploymentFrequencyDetails wrong: ${error}`);
  }
};
