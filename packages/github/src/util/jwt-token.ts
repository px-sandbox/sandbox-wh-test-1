import { Config } from 'sst/node/config';
import NodeRSA from 'node-rsa';
import githubAppJwt from 'universal-github-app-jwt';
import { HttpStatusCode, logger, responseParser } from 'core';
import { APIGatewayProxyResult } from 'aws-lambda';
import { JWTResponse } from 'pulse-abstraction/github/type';

function getPrivateKey(pem: string) {
  const pemString = Buffer.from(pem, 'base64').toString('binary');
  const keydata = new NodeRSA(pemString);
  try {
    return keydata.exportKey('pkcs8-private-pem');
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}

export async function getOauthCode(): Promise<JWTResponse> {
  const privateKey = getPrivateKey(Config.GITHUB_APP_PRIVATE_KEY_PEM as string);
  try {
    const { token, expiration } = await githubAppJwt({
      id: parseInt(Config.GITHUB_APP_ID),
      privateKey: privateKey,
    });
    logger.info('JWT token created successfully');
    return {
      statusCode: 200,
      body: {
        type: 'Bearer',
        token: token,
        expiry: new Date(expiration * 1000).toLocaleString(),
      },
    };
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
