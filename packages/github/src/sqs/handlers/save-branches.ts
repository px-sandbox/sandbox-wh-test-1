import { SQSEvent } from 'aws-lambda';
import { logger } from 'core';
import { getBranches } from 'src/lib/get-branch-list';

export const handler = async function saveBranches(event: SQSEvent): Promise<void> {
  for (const record of event.Records) {
    const messageBody = JSON.parse(record.body);
    logger.info('AFTER_REPO_SAVE_BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
    await getBranches(messageBody.body.githubRepoId, messageBody.body.name, messageBody.body.owner);
  }
};
