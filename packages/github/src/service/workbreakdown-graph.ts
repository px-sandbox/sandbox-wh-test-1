import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import middy, { Request } from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { workbreakdownGraphSchema } from '../schema/workbreakdown-graph';
import { getTotalWorkbreakdown } from '../matrics/get-total-work-break-down';

const baseHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {

  console.log("baseHandler.invoked");

  const { requestId } = event.requestContext;
  try {
    const { repoIds, startDate, endDate  } = event.queryStringParameters as { repoIds: string, startDate: string, endDate: string };
    const repoIdList = repoIds.split(',');

    logger.info({
      message: 'workbreakdownGraph.params',
      data: { repoIds, startDate, endDate },
      requestId,
    });

    const searchResult = await getTotalWorkbreakdown(repoIdList, startDate, endDate);

    const data = {
      refactor: Math.round(searchResult.aggregations?.refactor?.value || 0),
      rewrite: Math.round(searchResult.aggregations?.rewrite?.value || 0),
      newWork: Math.round(searchResult.aggregations?.newWork?.value || 0)
    };

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
      eventSchema: transpileSchema(workbreakdownGraphSchema)
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
          
        }
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
    }
  }); 