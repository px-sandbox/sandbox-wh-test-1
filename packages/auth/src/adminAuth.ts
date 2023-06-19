import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as auth } from './auth';

export const handler = async (event: APIGatewayProxyEvent) => auth(event, 'ADMIN');
