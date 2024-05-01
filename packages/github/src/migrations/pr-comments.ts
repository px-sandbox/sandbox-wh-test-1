import { ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HttpStatusCode, logger, responseParser } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

async function fetchPRComments(repoId: string, owner: string, repoName: string): Promise<void> {
  try {
    let prFormattedData: any = [];
    let from = 0;
    const size = 100;

    
    // fetch All PR data for given repo from Elasticsearch
    do {
      const query = esb
        .requestBodySearch()
        .size(size)
        .from(from)
        .query(esb.boolQuery().must(esb.termQuery('body.repoId', repoId)))
        .toJSON();
      const getPrData = await esClient.search(
        Github.Enums.IndexName.GitPull,
        query,
      );
      prFormattedData = await searchedDataFormator(getPrData);
      await Promise.all(
        prFormattedData.map(async (prData: any) => {
          sqsClient.sendMessage(
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
