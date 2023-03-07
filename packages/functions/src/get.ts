import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { notes } from "./notes";
import logger from "@rest-api-ts/utils/src/logger";

export const handler = async function main(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const noteInfo = notes[event.pathParameters?.id!];

  logger.log({
    level: "info",
    message: "successfull notes api",
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
