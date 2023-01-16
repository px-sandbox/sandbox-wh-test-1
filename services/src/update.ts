import logger from "./../../utils/logger";
import {
  // APIGatewayProxyEvent,
  // APIGatewayProxyResult,
  APIGatewayProxyHandlerV2,
  // APIGatewayProxyHandlerV2WithJWTAuthorizer,
} from "aws-lambda";
import jwt from "jsonwebtoken";
import notes from "./notes";

export const handler: APIGatewayProxyHandlerV2 = async function main(event) {
  let username: string;
  const token: string = event.headers["authorization"]?.split(" ")[1] || "";
  console.log(token);
  if (token) {
    console.log(jwt.verify(token, "secret"));
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: true }),
    };
  }

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
