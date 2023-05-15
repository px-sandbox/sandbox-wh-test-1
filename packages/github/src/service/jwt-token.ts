import { Config } from 'sst/node/config';
import NodeRSA from 'node-rsa';
import { HttpStatusCode, logger, responseParser } from 'core';
import { APIGatewayProxyResult } from 'aws-lambda';
import { getOauthCode } from 'src/util/jwt-token';

export async function getOauthToken(): Promise<APIGatewayProxyResult> {
  try {
    const { body } = await getOauthCode();
    logger.info('JWT token created successfully');
    return responseParser
      .setBody({ token: body.token, expiry: body.expiry })
      .setMessage('get metadata')
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
