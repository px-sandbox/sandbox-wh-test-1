import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { ElasticClient, logger, updateTable } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { region } from 'src/constant/config';
import { branchFormator } from 'src/util/branch-formatter';
import { Config } from 'sst/node/config';

export async function saveBranchDetails(data: Github.ExternalType.Api.Branch): Promise<void> {
  const branchId = `gh_branch_${data.id}`;
  try {
    const records = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(branchId)
    );
    const result = await branchFormator(data, records?.parentId);
    if (records === undefined) {
      logger.info('---NEW_RECORD_FOUND---');
      await new DynamoDbDocClient(region, Config.STAGES).put(
        new ParamsMapping().preparePutParams(result.id, result.body.id)
      );
    }
    await new ElasticSearchClient().putDocument(Github.Enums.IndexName.GitUsers, result);
  } catch (error: unknown) {
    logger.error('getBranchDetails.error', {
      error,
    });
    throw error;
  }
}
