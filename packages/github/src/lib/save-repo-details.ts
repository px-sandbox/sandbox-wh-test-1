import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { region } from 'src/constant/config';
import { repoFormator } from 'src/util/repoFormator';
import { Config } from 'sst/node/config';
export async function saveRepoDetails(data: Github.ExternalType.Api.Repository): Promise<void> {
  const repoId = `gh_repo_${data?.id}`;
  try {
    const records = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(repoId)
    );
    const result = await repoFormator(data, records?.parentId);
    if (records === undefined) {
      logger.info('---NEW_RECORD_FOUND---');
      await new DynamoDbDocClient(region, Config.STAGES).put(
        new ParamsMapping().preparePutParams(result.id, result.body.id)
      );
    }
    await new ElasticSearchClient().putDocument(Github.Enums.IndexName.GitRepo, result);
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
