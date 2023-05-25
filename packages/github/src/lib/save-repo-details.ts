import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { region } from 'src/constant/config';
import { repoFormator } from 'src/util/repoFormator';
import { Config } from 'sst/node/config';
import { Repo } from 'src/formatters/repo';

export async function saveRepoDetails(data: Github.ExternalType.Api.Repository): Promise<void> {
  const repoId = `gh_repo_${data?.id}`;
  try {
    const records = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(repoId)
    );
    const result = new Repo(data).validate();
    if (result) {
      const formattedData = result.formatter(records?.parentId);
      if (records === undefined) {
        logger.info('---NEW_RECORD_FOUND---');
        await new DynamoDbDocClient(region, Config.STAGE).put(
          new ParamsMapping().preparePutParams(formattedData.id, formattedData.body.id)
        );
      }
      await new ElasticSearchClient().putDocument(Github.Enums.IndexName.GitRepo, formattedData);
    }
  } catch (error: unknown) {
    logger.error({
      error,
    });
    throw error;
  }
}
