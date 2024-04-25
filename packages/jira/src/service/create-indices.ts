import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { createIndices } from '../indices/indices';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  await createIndices();
  logger.info({ message: 'createIndices.created' });
  return responseParser
    .setBody({ message: 'All Jira indices created successfully' })
    .setMessage('Created Jira Indices')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
