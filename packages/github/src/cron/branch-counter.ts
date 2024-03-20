import {
  Hit,
  ElasticSearchClientGh
} from '@pulse/elasticsearch';
import { SQSClientGh } from '@pulse/event-handler';
import { Github } from 'abstraction';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import moment from 'moment';
import { searchedDataFormator } from 'src/util/response-formatter';
import { Queue } from 'sst/node/queue';

const esClient = ElasticSearchClientGh.getInstance();
const sqsClient = SQSClientGh.getInstance();

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
  return await searchedDataFormator(data);
};
// get all repos from ES which are not deleted and send to SQS
async function getReposAndSendToSQS(
  currentDate: string,
  pageNo = 1,
  perPage = 100
): Promise<number> {
  try {
    const repos = await getRepos(pageNo, perPage);
    await Promise.all(
      repos.map((repo: Hit<{ body: Github.Type.Repository }>) => {
        if (repo._source && repo._source.body) {
          return sqsClient.sendMessage(
            {
              repo: repo._source.body as Github.Type.Repository,
              date: currentDate,
            },
            Queue.qGhActiveBranchCounterFormat.queueUrl
          );
        }
        return Promise.resolve();
      })
    );

    return repos.length;
  } catch (error: unknown) {
    logger.error(`
    getReposAndSendToSQS.error at page: ${pageNo}
    Error: ${JSON.stringify(error)}
    `);
    throw error;
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<void> {
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
      processingCount = await getReposAndSendToSQS(today, pageNo, perPage);
      logger.info(`processingCount: ${processingCount}`);
      pageNo += 1;
    } while (processingCount === perPage);

    logger.info(
      `getReposAndSendToSQS.handler.successful for ${pageNo} pages at: ${new Date().toISOString()}`
    );
  } catch (error: unknown) {
    logger.error(`
    getReposAndSendToSQS.handler.error at: ${new Date().toISOString()}
    Error: ${JSON.stringify(error)}
    `);

    throw error;
  }
}
