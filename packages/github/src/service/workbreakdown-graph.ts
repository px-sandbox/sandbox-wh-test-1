import middy, { Request } from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import { getWorkbreakdownGraph } from '../matrics/get-workbreakdown-graph';
import { workbreakdownGraphSchema } from '../schema/workbreakdown-graph';

const baseHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  logger.info({
    message: 'workbreakdownGraph.invoked',
  });

  const { requestId } = event.requestContext;
  try {
    const { repoIds, startDate, endDate } = event.queryStringParameters as {
      repoIds: string;
      startDate: string;
      endDate: string;
    };
    const repoIdList = repoIds.split(',');

    logger.info({
      message: 'workbreakdownGraph.params',
      data: { repoIds, startDate, endDate },
      requestId,
    });

    const data = await getWorkbreakdownGraph(repoIdList, startDate, endDate);

    logger.info({
      message: 'workbreakdownGraph.success',
      data,
      requestId,
    });

    return responseParser
      .setBody({ data })
      .setMessage('Workbreakdown graph data fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();
  } catch (error) {
    logger.error({
      message: 'workbreakdownGraph.error',
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
        message: 'workbreakdownGraph.error',
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
