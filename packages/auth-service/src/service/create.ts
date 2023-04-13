import responseParser from "@my-sst-app/core/lib/response-parser";
import { HttpStatusCode } from "@my-sst-app/core/constant/httpStatusCode";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { transpileSchema } from "@middy/validator/transpile";
import { createUserSchema } from "./validations";
import APIHandler from "@my-sst-app/core/lib/api";
import { ddbDocClient } from "@my-sst-app/core/lib/dynamo/document-client";
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import logger from "@my-sst-app/core/lib/logger";
import { region, dynamo_endpoint } from "./../constant/config";

const createUser = async (
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
  if (event.body) {
    logger.info(event.body);
    const { email, password, firstName, lastName } = JSON.parse(
      JSON.stringify(event.body),
    );
    const params: PutCommandInput = {
      TableName: "users",
      Item: {
        primaryKey: email,
      },
      Expected: {
        email,
        password,
        firstName,
        lastName,
      },
    };
    ddbDocClient(region as string, dynamo_endpoint as string).send(
      new PutCommand(params),
    );
    return responseParser
      .setBody(event.body)
      .setMessage("signup successful")
      .setStatusCode(HttpStatusCode[200])
      .setResponseBodyCode("SUCCESS")
      .send();
  } else {
    return responseParser
      .setBody({})
      .setMessage("signup error -- data not provided")
      .setStatusCode(HttpStatusCode[400])
      .setResponseBodyCode("ERROR")
      .send();
  }
};

export const handler = APIHandler(createUser, {
  eventSchema: transpileSchema(createUserSchema),
});
