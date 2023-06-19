import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler as auth } from './auth';
import { Other } from 'abstraction';

export const handler = async (event: APIGatewayProxyEvent, context: Context) =>
  auth(event, context, Other.Enum.Role.ADMIN);
