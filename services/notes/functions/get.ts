import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Logger from 'notes-utils';
import { handler as notes } from './notes';

export const handler = async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const noteInfo = notes[event.pathParameters?.id!];

  Logger.log({
    level: 'info',
    message: 'successfull notes api',
  });

  return notes
    ? {
        statusCode: 200,
        body: JSON.stringify(noteInfo),
      }
    : {
        statusCode: 404,
        body: JSON.stringify({ error: true }),
      };
};
