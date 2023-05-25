import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { ElasticClient, logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { region } from 'src/constant/config';
import { userFormator } from 'src/util/user-formatter';
import { Config } from 'sst/node/config';
import { Users } from 'src/formatters/users';

export async function saveUserDetails(data: Github.ExternalType.Api.User): Promise<void> {
  const userId = `gh_user_${data?.id}`;
  try {
    const records = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(userId)
    );
    const result = new Users(data).validate();
    if (result) {
      const formattedData = result.formatter(records?.parentId);
      if (records === undefined) {
        logger.info('---NEW_RECORD_FOUND---');
        await new DynamoDbDocClient(region, Config.STAGE).put(
          new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
        );
      }
      await new ElasticSearchClient().putDocument(Github.Enums.IndexName.GitUsers, formattedData);
    }
  } catch (error: unknown) {
    logger.error('getUserDetails.error', {
      error,
    });
    throw error;
  }
}
