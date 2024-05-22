import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { createAllIndices } from '../indices/indices';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await createAllIndices();
  logger.info({ message: 'AllIndices.created' });
  return responseParser
    .setBody({ message: 'AllIndices.created' })
    .setMessage('Create Indices')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
