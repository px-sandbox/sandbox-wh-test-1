import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { getBranches } from '../../lib/get-branch-list';

export const handler = async function saveBranches(event: SQSEvent): Promise<void> {
  logger.info(`Records Length: ${event.Records.length}`);
  await Promise.all(
    event.Records.map(async (record: any) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info('AFTER_REPO_SAVE_BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
        await getBranches(
          messageBody.body.githubRepoId,
          messageBody.body.name,
          messageBody.body.owner
        );
      } catch (error) {
        logger.error('saveBranches.error', error);
      }
    })
  );
};
