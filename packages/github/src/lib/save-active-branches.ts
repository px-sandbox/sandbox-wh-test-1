import { DynamoDbDocClient, DynamoDbDocClientGh } from '@pulse/dynamodb';
import { ElasticSearchClientGh } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';

const esClientObj = ElasticSearchClientGh.getInstance();
const dynamodbClient = DynamoDbDocClientGh.getInstance();
export async function saveActiveBranch(data: Github.Type.ActiveBranches): Promise<void> {
  try {
    await dynamodbClient.put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    await esClientObj.putDocument(Github.Enums.IndexName.GitActiveBranches, data);
    logger.info('saveActiveBranchDetails.successful');
  } catch (error: unknown) {
    logger.error('saveActiveBranchDetails.error', {
      error,
    });
    throw error;
  }
}
