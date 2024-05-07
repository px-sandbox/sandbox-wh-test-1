import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { HitBody } from 'abstraction/other/type';
import async from 'async';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import esb from 'elastic-builder';
import { Queue } from 'sst/node/queue';
import { ActiveBranchProcessor } from '../../../processors/active-branch';
import { logProcessToRetry } from 'rp';

const esClient = ElasticSearchClient.getInstance();
const getBranches = async (repoId: string, date: string): Promise<HitBody> => {
  const body = esb
    .requestBodySearch()
    .size(0)
    .query(
      esb
        .boolQuery()
        .must(esb.termQuery('body.repoId', repoId))
        .should([
          esb.termQuery('body.isDeleted', false),
          esb.rangeQuery('body.deletedAt').gte(date),
        ])
        .minimumShouldMatch(1)
    )
    .toJSON();

  const esData: HitBody = await esClient.search(
    Github.Enums.IndexName.GitBranch,
    body,
  );
  return esData
}
async function countBranchesAndSendToSQS(
  repo: Github.Type.Repository,
  date: string
): Promise<void> {
  try {
    const esData = await getBranches(repo.id, date);  
    const {
        hits: {
          total: { value: totalActiveBranches },
        },
    } = esData;

    const branchProcessor = new ActiveBranchProcessor({
      repoId: repo.id,
      organizationId: repo.organizationId,
      createdAt: date,
      branchesCount: totalActiveBranches,
    });
    const data = await branchProcessor.processor();
    await branchProcessor.save({
      data,
      eventType: Github.Enums.Event.ActiveBranches,
      processId: data?.processId,
    });
  } catch (error: unknown) {
    logger.error(`
    countBranchesAndSendToSQS.error for ${repo.id} at ${date}
    Error: ${error}
    `);
    throw error;
  }
}

export async function handler(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => { 
    try {
      const { repo, date }: { date: string; repo: Github.Type.Repository } = JSON.parse(
        record.body
      );
      await countBranchesAndSendToSQS(repo, date);
    } catch (error) {
      await logProcessToRetry(record, Queue.qGhActiveBranchCounterFormat.queueUrl, error as Error);
    }
  }));
}
