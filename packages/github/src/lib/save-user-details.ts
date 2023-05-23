import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'model/params-mapping';
import { region } from 'src/constant/config';
import { userFormator } from 'src/util/user-formatter';
import { Config } from 'sst/node/config';

export async function saveUserDetails(data: Github.ExternalType.Api.User): Promise<void> {
  const userId = `gh_user_${data?.id}`;
  try {
    const { Items } = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(userId)
    );
    const result = await userFormator(data, Items?.parentId);
    if (!Items) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
      await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitUsers, result);
    } else {
      logger.info('---UPDATE USER RECORD---');
      await ElasticClient.partialUpdateDocument(Github.Enums.IndexName.GitUsers, result);
    }
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
