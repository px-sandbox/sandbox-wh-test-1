import { APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { jira } from 'src/lib/jira';

export const handler = async (): Promise<APIGatewayProxyResult> => {
  const redirectUrl = await new jira().initialize();
  return responseParser
    .setBody({ link: redirectUrl })
    .setMessage('JIRA AUTHENTICATION LINK')
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode('SUCCESS')
    .send();
};
