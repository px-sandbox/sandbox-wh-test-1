import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { saveActiveBranch } from '../../../lib/save-active-branches';
import { Github } from 'abstraction';
import { logProcessToRetry } from 'src/util/retry-process';

export async function handler(event: SQSEvent): Promise<void> {
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body) as Github.Type.ActiveBranches;

        logger.info('ACTIVE_BRANCH_SQS_RECIEVER_HANDLER_COUNTER', { messageBody });

        await saveActiveBranch(messageBody);
      } catch (error) {
        logProcessToRetry(record, Queue.gh_active_branch_counter_index.queueUrl, error as Error);
        logger.error('branchCounterDataReciever.error', { error });
      }
    })
  );
}
