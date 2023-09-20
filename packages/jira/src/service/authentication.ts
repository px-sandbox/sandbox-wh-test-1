import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { jira } from 'src/lib/jira';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  // const redirectUrl = await new jira().initialize();
  logger.info('inside handler');
  return responseParser
    .setBody({ message:'' })
    .setMessage('JIRA AUTHENTICATION SUCCESS')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
