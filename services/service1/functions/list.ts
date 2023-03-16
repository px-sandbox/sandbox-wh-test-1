import { APIGatewayProxyResult } from 'aws-lambda';
import { notes } from 'services/service1/functions/notes';

export const list = async function handler(): Promise<APIGatewayProxyResult> {
  return {
    statusCode: 200,
    body: JSON.stringify(notes, null, '  '),
  };
};
