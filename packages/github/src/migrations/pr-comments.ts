import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Config } from 'sst/node/config';
import { Queue } from 'sst/node/queue';

async function fetchPRComments(repoId: string, owner: string, repoName: string): Promise<void> {
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const sqs = new SQSClient();
    let prFormattedData: any = [];
    let from = 0;
    let size = 100;

    const { query } = esb
      .requestBodySearch()
      .query(esb.boolQuery().must(esb.termQuery('body.repoId', repoId)))
      .toJSON() as { query: object };
    // fetch All PR data for given repo from Elasticsearch
    do {
      const getPrData = await esClient.searchWithEsb(
        Github.Enums.IndexName.GitPull,
        query,
        from,
        size
      );
      prFormattedData = await searchedDataFormator(getPrData);
      await Promise.all(
        prFormattedData.map(async (prData: any) => {
          await sqs.sendMessage(
            { prData, owner, repoName },
            Queue.qGhPrReviewCommentMigration.queueUrl
          );
        })
      );
      from += size;
    } while (prFormattedData.length == size);
  } catch (error) {
    logger.error(`error_fetching_PR_comments:, ${error}`);
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const repoIds = event.queryStringParameters?.repoIds;
  const owner = event.queryStringParameters?.owner;
  const repoName = event.queryStringParameters?.repoName;

  if (!repoIds || !owner || !repoName) {
    return responseParser
      .setBody('repoIds, owner, repoName are required')
      .setMessage('repoIds, owner, repoName are required')
      .setStatusCode(HttpStatusCode['400'])
      .setResponseBodyCode('BAD_REQUEST')
      .send();
  }
  const repos = await fetchPRComments(repoIds, owner, repoName);
  return responseParser
    .setBody({ headline: repos })
    .setMessage('Headline for update protected keyword in branch data')
    .setStatusCode(HttpStatusCode['200'])
    .setResponseBodyCode('SUCCESS')
    .send();
}
