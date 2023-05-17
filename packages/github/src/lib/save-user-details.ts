import { ElasticClient, find, logger, updateTable } from 'core';
import { Github } from 'abstraction';
import { userFormator } from 'src/util/user-formatter';

export async function saveUserDetails(
  data: Github.ExternalType.Api.User
): Promise<void> {
  try {
    const record = await find(`gh_user_${data?.id}`);
    const result = await userFormator(data, record?.parentId);
    if (!record) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
    }
    logger.info('--UPDATE_RECORD_ELASTIC---');
    await ElasticClient.saveOrUpdateDocument(
      Github.Enums.IndexName.GitUsers,
      result
    );
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
