import { notes } from '@packages/notes';
import { APIGatewayProxyResult } from 'aws-lambda';

export const list = async function handler(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, '  '),
  };
};
