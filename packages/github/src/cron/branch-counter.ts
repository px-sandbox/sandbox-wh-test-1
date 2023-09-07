import { ElasticSearchClient, SearchResponse, Hit } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { logger } from 'core';
import { Github } from 'abstraction';
import { SQSClient } from '@pulse/event-handler';

// get all repos from ES which are not deleted and send to SQS
async function getReposAndSendToSQS(
  currentDate: string,
  pageNo = 1,
  perPage = 100
): Promise<number> {
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const {
      body: {
        hits: { hits: repos },
      },
    } = (await esClient.getClient().search({
      index: Github.Enums.IndexName.GitRepo,
      size: perPage,
      from: (pageNo - 1) * perPage,
      body: {
        query: {
          // bool: {
          //   must: [
          //     {
          //       match: {
          //         isDeleted: false,
          //       },
          //     },
          //   ],
          // },
          match_all: {},
        },
      },
    })) as { body: SearchResponse<{ body: Github.Type.Repository }> };

    await Promise.all(
      repos.map((repo: Hit<{ body: Github.Type.Repository }>) => {
        if (repo._source && repo._source.body) {
          new SQSClient().sendMessage(
            {
              repo: repo._source.body as Github.Type.Repository,
              date: currentDate,
            },
            Queue.gh_active_branch_counter_format.queueUrl
          );
        }
      })
    );

    return repos.length;
  } catch (error: any) {
    logger.error(`
    getReposAndSendToSQS.error at page: ${pageNo}
    Error: ${JSON.stringify(error)}
    `);
    throw error;
  }
}

export async function handler(): Promise<void> {
  try {
    const today = moment().format('YYYY-MM-DD');

    let processingCount = 0;
    let pageNo = 1;
    const perPage = 100;
    do {
      processingCount = await getReposAndSendToSQS(today, pageNo, perPage);
      console.log(`processingCount: ${processingCount}`);
      pageNo++;
    } while (processingCount === perPage);

    logger.info(
      `getReposAndSendToSQS.handler.successfull for ${pageNo} pages at: ${new Date().toISOString()}`
    );
  } catch (error: unknown) {
    logger.error(`
    getReposAndSendToSQS.handler.error at: ${new Date().toISOString()}
    Error: ${JSON.stringify(error)}
    `);

    throw error;
  }
}
