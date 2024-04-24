import { Config } from 'sst/node/config';
import { APIGatewayAuthorizerResultContext, APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { logger } from 'core';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<{ isAuthorized: boolean; context: APIGatewayAuthorizerResultContext }> => {
  const { requestId } = event.requestContext;
  try {
    logger.info({
      requestId,
      message: 'auth.handler.invoked',
      data: { event },
    });
    if (process.env.IS_LOCAL) {
      return {
        isAuthorized: true,
        context: {},
      };
    }

    const authHeader = event.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7, authHeader.length);
      const publicKey = Buffer.from(Config.AUTH_PUBLIC_KEY, 'base64').toString();
      const user: jwt.JwtPayload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
      }) as jwt.JwtPayload;
      return {
        isAuthorized: true,
        context: { user: JSON.stringify(user) },
      };
    }
    return {
      isAuthorized: false,
      context: {},
    };
  } catch (error) {
    logger.error({
      requestId,
      message: 'auth.handler.error',
      data: { error },
    });
    return {
      isAuthorized: false,
      context: {},
    };
  }
};
