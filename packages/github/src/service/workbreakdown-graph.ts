import { ElasticSearchClient } from '@pulse/elasticsearch';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { IndexName as GithubIndices } from 'abstraction/github/enums';
import moment from 'moment';
import { HitBody } from 'abstraction/other/type';

const elasticsearchClient = ElasticSearchClient.getInstance();

export const handler = async function workbreakdownGraph(
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

    return responseParser
      .setMessage(`Failed to fetch workbreakdown graph data`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
}; 