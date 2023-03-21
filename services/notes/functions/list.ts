import { APIGatewayProxyResult } from 'aws-lambda';
import { handler as notes } from 'services/notes/functions/notes';

export const handler =
  async function handler(): Promise<APIGatewayProxyResult> {
    return {
      statusCode: 200,
      body: JSON.stringify(notes, null, '  '),
    };
  };
