import { APIGatewayProxyEvent } from 'aws-lambda';
import { logger } from 'core';
import { getBranchList } from 'src/lib/get-branch-list';

export const handler = async function saveBranches(event: APIGatewayProxyEvent): Promise<any> {
  const [record] = event.Records;
  const messageBody = JSON.parse(record.body);
  logger.info('AFTER_REPO_SAVE_BRANCH_SQS_RECIEVER_HANDLER', { messageBody });
return await getBranchList(
    messageBody.body.githubRepoId,
    messageBody.body.name,
    messageBody.body.owner
  );
};
