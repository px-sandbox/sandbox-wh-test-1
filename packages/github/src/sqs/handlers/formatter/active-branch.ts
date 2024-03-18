import { ElasticSearchClient, ElasticSearchClientGh } from '@pulse/elasticsearch';
import esb from 'elastic-builder';
import { Config } from 'sst/node/config';
import { Github } from 'abstraction';
import { Queue } from 'sst/node/queue';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { ActiveBranchProcessor } from '../../../processors/active-branch';
import { logProcessToRetry } from '../../../util/retry-process';
import async from 'async';
import { HitBody } from 'abstraction/other/type';

const esClient = ElasticSearchClientGh.getInstance();

async function countBranchesAndSendToSQS(
  repo: Github.Type.Repository,
  date: string
): Promise<void> {
  try {
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

    const esData:HitBody = await esClient.searchWithEsb(
       Github.Enums.IndexName.GitBranch,
      body,
    );

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
    const data = await branchProcessor.processor();
    await branchProcessor.save({ data, eventType: Github.Enums.Event.ActiveBranches });
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
