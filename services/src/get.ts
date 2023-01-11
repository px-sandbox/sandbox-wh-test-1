import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import notes from "./notes";
import logger from "./../../utils/logger";

export const main = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const note =
    event.pathParameters && event.pathParameters.id
      ? notes[event.pathParameters.id]
      : null;

  logger.log({
    level: "error",
    message: "successfull notes api",
  });
  console.log("123");
  return note
    ? {
        statusCode: 200,
        body: JSON.stringify(note, null, " "),
      }
    : {
        statusCode: 404,
        body: JSON.stringify({ error: true }),
      };
};
