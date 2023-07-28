import { Other } from 'abstraction';
import { APIGatewayAuthorizerResultContext, APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import jwt from 'jsonwebtoken';
import { Config } from 'sst/node/config';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<{ isAuthorized: boolean; context: APIGatewayAuthorizerResultContext }> => {
  try {
    logger.info('AdminAuth.invoked', { event });
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
      const user: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      return {
        isAuthorized: user && user.role === Other.Enum.Role.ADMIN,
        context: { user },
      };
    }
    return {
      isAuthorized: false,
      context: {},
    };
  } catch (error) {
    logger.error('AdminAuth.error', { error });
    return {
      isAuthorized: false,
      context: {},
    };
  }
};
