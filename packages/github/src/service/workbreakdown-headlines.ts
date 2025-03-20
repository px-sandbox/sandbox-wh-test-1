import { ElasticSearchClient } from '@pulse/elasticsearch';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import middy, { Request } from '@middy/core';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import { workbreakdownGraphSchema } from '../schema/workbreakdown-graph';
import { HitBody } from 'abstraction/other/type';

const elasticsearchClient = ElasticSearchClient.getInstance();

const baseHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const { requestId } = event.requestContext;
  try {
    const { repoIds, startDate, endDate } = event.queryStringParameters as { repoIds: string, startDate: string, endDate: string };
    const repoIdList = repoIds.split(',');

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
        esb.sumAggregation('newFeature_sum', 'body.workbreakdown.newFeature')
      )
      .agg(
        esb.sumAggregation('refactor_sum', 'body.workbreakdown.refactor')
      )
      .agg(
        esb.sumAggregation('rewrite_sum', 'body.workbreakdown.rewrite')
      )
      .toJSON();

    const searchResult: HitBody = await elasticsearchClient.search(GithubIndices.GitCommits, query);

    const newFeatureSum = Math.round(searchResult.aggregations?.newFeature_sum?.value || 0);
    const refactorSum = Math.round(searchResult.aggregations?.refactor_sum?.value || 0);
    const rewriteSum = Math.round(searchResult.aggregations?.rewrite_sum?.value || 0);

    const totals = newFeatureSum + refactorSum + rewriteSum;
    
    logger.info({
      message: 'workbreakdownHeadlines.success',
      data: {
        repoIds,
        startDate,
        endDate,
        totalHits: searchResult.hits.total.value,
        totals
      },
      requestId,
    });

    return responseParser
      .setBody({
        data: totals
      })
      .setMessage('Workbreakdown headlines fetched successfully')
      .setStatusCode(HttpStatusCode['200'])
      .setResponseBodyCode('SUCCESS')
      .send();

  } catch (error) {
    logger.error({
      message: 'workbreakdownHeadlines.error',
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
        message: 'workbreakdownHeadlines.error',
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