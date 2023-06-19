import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler as auth } from './auth';

export const handler = async (event: APIGatewayProxyEvent, context: Context) =>
  auth(event, context, 'ADMIN');
