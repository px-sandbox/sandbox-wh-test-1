import { ElasticSearchClient } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { ActiveBranchProcessor } from '../../../processors/active-branch';
import { logProcessToRetry } from '../../../util/retry-process';
import async from 'async';

async function countBranchesAndSendToSQS(
  repo: Github.Type.Repository,
  date: string
): Promise<void> {
  try {
    const esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const body = esb
      .requestBodySearch()
      .size(0)
      .query(
        esb
          .boolQuery()
          .must(esb.termQuery('body.repoId', repo.id))
          .should([
            esb.termQuery('body.isDeleted', false),
            esb.rangeQuery('body.deletedAt').gte(date),
          ])
          .minimumShouldMatch(1)
      )
      .toJSON();

    const esData = await esClient.getClient().search({
      index: Github.Enums.IndexName.GitBranch,
      body,
    });

    const {
      body: {
        hits: {
          total: { value: totalActiveBranches },
        },
      },
    } = esData;

    const branchProcessor = new ActiveBranchProcessor({
      repoId: repo.id,
      organizationId: repo.organizationId,
      createdAt: date,
      branchesCount: totalActiveBranches,
    });

    const isValid = await branchProcessor.validate();

    if (!isValid) {
      logger.error(`
      countBranchesAndSendToSQS.validationError for ${JSON.stringify(repo)} at ${date}
      Error: Not valids
      `);

      return;
    }

    const data = await branchProcessor.processor();
    await branchProcessor.indexDataToES({ data, eventType: 'active-branch' });
  } catch (error: unknown) {
    logger.error(`
    countBranchesAndSendToSQS.error for ${JSON.stringify(repo)} at ${date}
    Error: ${JSON.stringify(error)}
    `);

    throw error;
  }
}

export async function handler(event: SQSEvent): Promise<void> {
  await async.eachSeries(event.Records, async (record: SQSRecord) => {
    try {
      const { repo, date }: { date: string; repo: Github.Type.Repository } = JSON.parse(
        record.body
      );
      await countBranchesAndSendToSQS(repo, date);
    } catch (error) {
      await logProcessToRetry(record, Queue.qGhActiveBranchCounterFormat.queueUrl, error as Error);
    }
  });
}
