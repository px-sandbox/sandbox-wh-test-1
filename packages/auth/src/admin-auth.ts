import { Other } from 'abstraction';
import { APIGatewayAuthorizerResultContext, APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import jwt from 'jsonwebtoken';
import { Config } from 'sst/node/config';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<{ isAuthorized: boolean; context: APIGatewayAuthorizerResultContext }> => {
  const requestId = event?.requestContext?.requestId;
  try {
    logger.info({ message: 'AdminAuth.invoked', requestId, data: { event } });
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
        isAuthorized: user && user.role === Other.Enum.Role.ADMIN,
        context: { user: JSON.stringify(user) },
      };
    }
    return {
      isAuthorized: false,
      context: {},
    };
  } catch (error) {
    logger.error({ requestId, message: 'AdminAuth.error', error });
    return {
      isAuthorized: false,
      context: {},
    };
  }
};
