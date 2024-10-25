import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getDeploymentFrequencyDetails } from 'src/matrics/get-deployment-frequency-details';

export const handler = async function deploymentFrequencyDetails(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const repoIds = event.queryStringParameters?.repoIds?.split(',') || [];
    const env = event.queryStringParameters?.env || '';
    const startDate = event.queryStringParameters?.startDate || '';
    const endDate = event.queryStringParameters?.endDate || '';
    const page = event.queryStringParameters?.page || '1';
    const limit = event.queryStringParameters?.limit || '10';

    const { result, totalPages } = await getDeploymentFrequencyDetails(
      repoIds,
      env,
      startDate,
      endDate,
      parseInt(page),
      parseInt(limit)
    );

    return responseParser
      .setBody({ result, totalPages })
      .setMessage('Deployment frequency details data retrieved successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({ message: 'deploymentFrequencyDetails.error', error: `${error}` });
    throw new Error(`deploymentFrequencyDetails wrong: ${error}`);
  }
};
