import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";

import notes from "./notes";

export const handler: APIGatewayProxyHandlerV2WithJWTAuthorizer =
  async function main(event) {
    const note =
      event.pathParameters && event.pathParameters.id
        ? notes[event.pathParameters.id]
        : null;

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

    return {
      statusCode: 200,
      body: JSON.stringify(note, null, " "),
    };
  };
