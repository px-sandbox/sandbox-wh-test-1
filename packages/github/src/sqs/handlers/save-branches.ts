import { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from 'core';
import { getBranches } from '../../lib/get-branch-list';

export const handler = async function saveBranches(event: SQSEvent): Promise<void> {
  logger.info({ message: "Records Length", data: JSON.stringify(event.Records.length) });
  await Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      try {
        const messageBody = JSON.parse(record.body);
        logger.info({ message: 'AFTER_REPO_SAVE_BRANCH_SQS_RECIEVER_HANDLER', data:  messageBody });
        await getBranches(
          messageBody.body.githubRepoId,
          messageBody.body.name,
          messageBody.body.owner
        );
      } catch (error) {
        logger.error({ message: 'saveBranches.error', error });
      }
    })
  );
};
