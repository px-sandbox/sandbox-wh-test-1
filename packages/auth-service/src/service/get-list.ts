import { HttpStatusCode } from "@my-sst-app/core/constant/httpStatusCode";
import responseParser from "@my-sst-app/core/lib/response-parser";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import APIHandler from "@my-sst-app/core/lib/api";
// import { ddbDocClient } from "@my-sst-app/core/lib/dynamo/document-client";
// import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
// import logger from "@my-sst-app/core/lib/logger";
// import { region, dynamo_endpoint } from "./../constant/config";

const getUsersList = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  // ddbDocClient(region as string, dynamo_endpoint as string).send(
  //   new PutCommand(params),
  // );
  return responseParser
    .setBody(event.body)
    .setMessage("get users list")
    .setStatusCode(HttpStatusCode[200])
    .setResponseBodyCode("SUCCESS")
    .send();
};

export const handler = APIHandler(getUsersList, {
  // eventSchema: transpileSchema(loginSchema),
});
