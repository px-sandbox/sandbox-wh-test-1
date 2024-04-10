import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';
import { deleteProcessfromDdb } from 'src/util/delete-process';

const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();
export async function saveActiveBranch(data: Github.Type.ActiveBranches,processId?:string): Promise<void> {
  try {
    await dynamodbClient.put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    await esClientObj.putDocument(Github.Enums.IndexName.GitActiveBranches, data);
    logger.info('saveActiveBranchDetails.successful');
      if (processId) {
        logger.info('deleting_process_from_DDB', { processId });
        await deleteProcessfromDdb(processId);
      }
  } catch (error: unknown) {
    logger.error('saveActiveBranchDetails.error', {
      error,
    });
    throw error;
  }
}
