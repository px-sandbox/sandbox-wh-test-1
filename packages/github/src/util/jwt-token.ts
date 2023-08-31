import NodeRSA from 'node-rsa';
import githubAppJwt from 'universal-github-app-jwt';
import { Config } from 'sst/node/config';
import { logger } from 'core';
import { JWTResponse } from 'abstraction/github/type';

function getPrivateKey(pem: string): string {
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
  const privateKey = getPrivateKey(Config.GITHUB_APP_PRIVATE_KEY_PEM);
  try {
    const appId = parseInt(Config.GITHUB_APP_ID, 10);
    const { token, expiration } = await githubAppJwt({
      id: appId,
      privateKey,
    });
    logger.info('JWT token created successfully');
    return {
      statusCode: 200,
      body: {
        type: 'Bearer',
        token,
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
