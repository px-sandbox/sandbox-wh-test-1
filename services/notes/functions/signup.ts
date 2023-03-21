import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import Logger from 'notes-utils';

export const handler = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  let signUpData: string;
  let token: string = '';
  if (event.body) {
    signUpData = event.body;
    Logger.info(signUpData);
    fs.writeFileSync('signup.txt', signUpData);
    token = jwt.sign(JSON.parse(signUpData), 'secret', { expiresIn: 60 * 60 });
  }

  return {
    statusCode: 200,
    body: token,
  };
};
