import { Hit, ElasticSearchClient } from '@pulse/elasticsearch';
import { SQSClient } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { searchedDataFormator } from '../util/response-formatter';

const esClient = ElasticSearchClient.getInstance();
const sqsClient = SQSClient.getInstance();

const getRepos = async (
  pageNo: number,
  perPage: number
): Promise<Hit<{ body: Github.Type.Repository }>[]> => {
  const query = esb
    .requestBodySearch()
    .size(perPage)
    .from((pageNo - 1) * perPage)
    .query(
      esb
        .boolQuery()
        .should([
          esb.termQuery('body.isDeleted', false),
          esb.boolQuery().mustNot(esb.existsQuery('body.isDeleted')),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();
  const data = await esClient.search(Github.Enums.IndexName.GitRepo, query);
  return searchedDataFormator(data);
};
// get all repos from ES which are not deleted and send to SQS
async function getReposAndSendToSQS(
  currentDate: string,
  requestId: string,
  pageNo = 1,
  perPage = 100
): Promise<number> {
  try {
    const repos = await getRepos(pageNo, perPage);
    await Promise.all(
      repos.map((repo: Hit<{ body: Github.Type.Repository }>) => {
        if (repo) {
          return sqsClient.sendMessage(
            {
              repo,
              date: currentDate,
            },
            Queue.qGhActiveBranchCounterFormat.queueUrl,
            { requestId, resourceId: repo._id }
          );
        }
        return Promise.resolve();
      })
    );

    return repos.length;
  } catch (error: unknown) {
    logger.error({ message: 'getReposAndSendToSQS.error', error, requestId });
    throw error;
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
  const requestId = event?.requestContext?.requestId;
  try {
    const today =
      event && event.queryStringParameters?.date
        ? event.queryStringParameters?.date
        : moment().format('YYYY-MM-DD');

    let processingCount = 0;
    let pageNo = 1;
    const perPage = 100;
    do {
      // eslint-disable-next-line no-await-in-loop
      processingCount = await getReposAndSendToSQS(today, requestId, pageNo, perPage);
      logger.info({ message: 'processingCount', data: processingCount, requestId });
      pageNo += 1;
    } while (processingCount === perPage);

    logger.info({
      message: 'getReposAndSendToSQS.handler.successful',
      data: { pageNo, date: new Date().toISOString() },
      requestId,
    });
  } catch (error: unknown) {
    logger.error({
      message: 'getReposAndSendToSQS.handler.error',
      data: { date: new Date().toISOString() },
      error,
      requestId,
    });

    throw error;
  }
}
