import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import Logger from 'notes-utils';
import { handler as notes } from 'services/notes/functions/notes';

export const handler: APIGatewayProxyHandlerV2 = async function main(event) {
  const token: string = event.headers['authorization']?.split(' ')[1] || '';

  if (jwt.verify(token, 'secret')) {
    Logger.log({
      level: 'info',
      message: 'successfully verified token',
    });
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: true }),
    };
  }

  const note = notes[event.pathParameters?.id!];

  if (!note) {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: true }),
    };
  }

  if (event.body) {
    const data = JSON.parse(event.body);
    note.content = data.content || note.content;
  }

  Logger.log({
    level: 'info',
    message: 'Successfully updated note',
  });

  return {
    statusCode: 200,
    body: JSON.stringify(note),
  };
};
