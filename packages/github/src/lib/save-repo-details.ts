import { DynamoDbDocClient } from '@pulse/dynamodb';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'model/params-mapping';
import { region } from 'src/constant/config';
import { repoFormator } from 'src/util/repoFormator';
import { Config } from 'sst/node/config';
export async function saveRepoDetails(data: Github.ExternalType.Api.Repository): Promise<void> {
  const repoId = `gh_repo_${data?.id}`;
  try {
    const { Items } = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(repoId)
    );
    const result = await repoFormator(data, Items?.parentId);
    logger.info(result);
    if (!Items) {
      logger.info('---NEW_RECORD_FOUND---');
      await updateTable(result);
    }
    await ElasticClient.saveOrUpdateDocument(Github.Enums.IndexName.GitRepo, result);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
