import middy from "@middy/core";
import validator from "@middy/validator";
import httpErrorHandler from "@middy/http-error-handler";
import jsonBodyParser from "@middy/http-json-body-parser";
import { ValidationErrorResponse } from "./validation-error-response";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

interface Handler {
  (
    event: APIGatewayProxyEvent,
    context?: Context,
  ): Promise<APIGatewayProxyResult>;
}

const APIHandler = (handler: Handler, validation: any) => {
  return middy(handler)
    .use(jsonBodyParser())
    .use(validator(validation))
    .use(ValidationErrorResponse)
    .use(httpErrorHandler());
};
export default APIHandler;
