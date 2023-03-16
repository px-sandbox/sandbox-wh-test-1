import logger from '@packages/abstraction/utils/logger';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import fs from 'fs';
import jwt from 'jsonwebtoken';

export const signup = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let signUpData: string;
  let token: string = '';
  if (event.body) {
    signUpData = event.body;
    logger.info(signUpData);
    fs.writeFileSync('signup.txt', signUpData);
    token = jwt.sign(JSON.parse(signUpData), 'secret', { expiresIn: 60 * 60 });
  }

  return {
    statusCode: 200,
    body: token,
  };
};
