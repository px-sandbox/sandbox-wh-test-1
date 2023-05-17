import { ElasticClient, find, logger, updateTable } from 'core';
import { Github } from 'abstraction';
import { updateUserFormator, userFormator } from 'src/util/user-formatter';

export async function saveUserDetails(data: Github.ExternalType.Api.User): Promise<void> {
  try {
    const record = await find(`gh_user_${data?.id}`);
    let result = {};
    if (!record) {
      logger.info('---NEW_RECORD_FOUND---');
      const result = await userFormator(data, record?.parentId);
      await updateTable(result);
    } else {
      logger.info('---UPDATE USER RECORD---');
      result = await updateUserFormator(data, record.parentId);
      await ElasticClient.partialUpdateDocument(Github.Enums.IndexName.GitUsers, result);
    }
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
