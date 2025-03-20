import { ElasticSearchClient } from '@pulse/elasticsearch';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import moment from 'moment';
import { HitBody } from 'abstraction/other/type';

const elasticsearchClient = ElasticSearchClient.getInstance();

export const handler = async function workbreakdownHeadlines(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { requestId } = event.requestContext;
  try {
    const { repoIds, startDate, endDate = moment().add(1, 'day').format('YYYY-MM-DD') } = event.queryStringParameters || {};

    // Validate required parameters
    if (!repoIds || !startDate || !endDate) {
      return responseParser
        .setMessage('Missing required parameters: repoIds, startDate, or endDate')
        .setStatusCode(HttpStatusCode['400'])
        .setResponseBodyCode('ERROR')
        .send();
    }

    // Validate date formats
    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      return responseParser
        .setMessage('Invalid date format. Use YYYY-MM-DD')
        .setStatusCode(HttpStatusCode['400'])
        .setResponseBodyCode('ERROR')
        .send();
    }

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
      .size(0) // We only need aggregations, not the actual documents
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

    logger.info({
      message: 'workbreakdownHeadlines.query',
      data: { query },
      requestId,
    });

    const searchResult: HitBody = await elasticsearchClient.search(GithubIndices.GitCommits, query);

    const totals = {
      newFeature: Math.round(searchResult.aggregations?.newFeature_sum?.value || 0),
      refactor: Math.round(searchResult.aggregations?.refactor_sum?.value || 0),
      rewrite: Math.round(searchResult.aggregations?.rewrite_sum?.value || 0)
    };

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
        data: totals.newFeature + totals.refactor + totals.rewrite
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

    return responseParser
      .setMessage(`Failed to fetch workbreakdown headlines`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
}; 