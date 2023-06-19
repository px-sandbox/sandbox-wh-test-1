import { Config } from 'sst/node/config';
import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { logger } from 'core';

export const handler = async (event: APIGatewayProxyEvent, context: Context, userRole?: string) => {
  try {
    logger.info('Auth.invoked', { event, userRole });
    if (process.env.IS_LOCAL) {
      return {
        isAuthorized: true,
        context: {},
      };
    }

    const authHeader = event.headers['authorization'] || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7, authHeader.length);
      const publicKey = Buffer.from(Config.AUTH_PUBLIC_KEY, 'base64').toString();
      const user: any = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      return {
        isAuthorized: userRole ? user.role === userRole : true,
        context: { user },
      };
    }
    return {
      isAuthorized: false,
      context: {},
    };
  } catch (error) {
    logger.error('Auth.error', { error });
    return {
      isAuthorized: false,
      context: {},
    };
  }
};
