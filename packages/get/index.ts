import logger from '@packages/abstraction/utils/logger';
import { notes } from '@packages/notes';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const get = async function main(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const noteInfo = notes[event.pathParameters?.id!];

  logger.log({
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
