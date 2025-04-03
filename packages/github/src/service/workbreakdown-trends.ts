import middy, { Request } from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getWorkbreakdownTrends } from '../matrics/get-workbreakdown-trends';
import { workbreakdownGraphSchema } from '../schema/workbreakdown-graph';

const baseHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  try {
    const { repoIds, startDate, endDate } = event.queryStringParameters as {
      repoIds: string;
      startDate: string;
      endDate: string;
    };
    const repoIdList = repoIds.split(',');

    logger.info({
      message: 'workbreakdownTrends.params',
      data: { repoIds, startDate, endDate },
      requestId,
    });

    const searchResult = await getWorkbreakdownTrends(repoIdList, startDate, endDate);

    logger.info({
      message: 'workbreakdownTrends.success',
      data: searchResult,
      requestId,
    });

    return responseParser
      .setBody({ data: searchResult })
      .setMessage('Workbreakdown trends data fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({
      message: 'workbreakdownTrends.error',
      error,
      requestId,
    });

    throw error;
  }
};

// Add middy validator
export const handler = middy(baseHandler)
  .use(
    validator({
      eventSchema: transpileSchema(workbreakdownGraphSchema),
    })
  )
  .use({
    onError: async (request: Request) => {
      const { error } = request;
      if (!error) return;

      logger.error({
        message: 'workbreakdownTrends.error',
        error,
        data: {
          event: request.event,
          context: request.context,
          error: request.error,
          response: request.response,
        },
      });

      // Check if it's a validation error
      if (error.name === 'BadRequestError') {
        return responseParser
          .setMessage(error.message)
          .setStatusCode(HttpStatusCode['400'])
          .setResponseBodyCode('ERROR')
          .send();
      }

      // Handle all other errors as 500
      return responseParser
        .setMessage(error.message)
        .setStatusCode(HttpStatusCode['500'])
        .setResponseBodyCode('ERROR')
        .send();
    },
  });
