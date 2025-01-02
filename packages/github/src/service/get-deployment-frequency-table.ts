import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { AggregationResponse } from 'abstraction/github/type';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, responseParser } from 'core';
import esb from 'elastic-builder';

const esClient = ElasticSearchClient.getInstance();

export const handler = async function (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const startDate: string = event.queryStringParameters?.startDate || '';
  const endDate: string = event.queryStringParameters?.endDate || '';
  const repoIds: string[] = event.queryStringParameters?.repoIds?.split(',') || [''];

  try {
    const query = esb
      .requestBodySearch()
      .size(0)
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.repoId', repoIds),
            esb.rangeQuery('body.createdAt').gte(startDate).lte(endDate),
          ])
      )
      .agg(esb.termsAggregation('destination_counts', 'body.destination'));

    const response: AggregationResponse = await esClient.queryAggs(
      Github.Enums.IndexName.GitDeploymentFrequency,
      query
    );
    const data = response.destination_counts.buckets.map(
      (bucket: { key: any; doc_count: any }) => ({
        destination: bucket.key,
        count: bucket.doc_count,
      })
    );
    return responseParser
      .setMessage('successfully fetched aggregate responses')
      .setResponseBodyCode('SUCCESS')
      .setBody(data)
      .setStatusCode(HttpStatusCode['200'])
      .send();
  } catch (error) {
    return responseParser
      .setMessage(`getDeploymentFrequency.error: ${error}`)
      .setStatusCode(HttpStatusCode['500'])
      .setResponseBodyCode('ERROR')
      .send();
  }
};
