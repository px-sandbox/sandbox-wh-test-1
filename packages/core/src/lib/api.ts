import middy from '@middy/core';
import validator from '@middy/validator';
import httpErrorHandler from '@middy/http-error-handler';
import jsonBodyParser from '@middy/http-json-body-parser';
import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ValidationErrorResponse } from './internal/validation-error-response';

interface Handler {
  (event: APIGatewayProxyEvent, context?: Context): Promise<APIGatewayProxyResult>;
}

const APIHandler = (handler: Handler, validation?: any) => {
  if (validation) {
    return middy(handler)
      .use(jsonBodyParser())
      .use(validator(validation))
      .use(ValidationErrorResponse)
      .use(httpErrorHandler());
  }
  return middy(handler).use(jsonBodyParser()).use(httpErrorHandler());
};
export { APIHandler };
