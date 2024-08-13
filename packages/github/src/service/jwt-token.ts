import { HttpStatusCode, logger, responseParser } from 'core';
import { APIGatewayProxyResult } from 'aws-lambda';
import { getOauthCode } from '../util/jwt-token';

export async function getOauthToken(): Promise<APIGatewayProxyResult> {
  try {
    const { body } = await getOauthCode();
    logger.info({ message: 'getOauthToken.info: JWT token created successfully' });
    return responseParser
      .setBody({ token: body.token, expiry: body.expiry })
      .setMessage('get JWT token')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error: unknown) {
    logger.error({ message: 'getOauthToken.error', error: `${error}` });
    throw error;
  }
}
