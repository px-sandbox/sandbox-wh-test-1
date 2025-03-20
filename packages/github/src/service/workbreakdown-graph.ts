import { ElasticSearchClient } from '@pulse/elasticsearch';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import middy, { Request } from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { HitBody } from 'abstraction/other/type';
import { workbreakdownGraphSchema } from '../schema/workbreakdown-graph';

const elasticsearchClient = ElasticSearchClient.getInstance();

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

    // Build elasticsearch query with aggregations
    const query = esb.requestBodySearch()
      .query(
        esb.boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIdList),
            esb.rangeQuery('body.createdAt')
              .gte(startDate)
              .lte(endDate)
          ])
      )
      .size(0)
      .agg(
        esb.sumAggregation('refactor', 'body.workbreakdown.refactor')
      )
      .agg(
        esb.sumAggregation('rewrite', 'body.workbreakdown.rewrite')
      )
      .agg(
        esb.sumAggregation('newWork', 'body.workbreakdown.newFeature')
      )
      .toJSON();

    logger.info({
      message: 'workbreakdownGraph.query',
      data: { query },
      requestId,
    });

    const searchResult: HitBody = await elasticsearchClient.search(GithubIndices.GitCommits, query);

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

    throw new Error("Intentional error");

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