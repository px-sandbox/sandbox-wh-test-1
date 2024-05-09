import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Github, Other } from 'abstraction';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';
import { deleteProcessfromDdb } from 'rp';

const esClientObj = ElasticSearchClient.getInstance();
const dynamodbClient = DynamoDbDocClient.getInstance();
export async function saveActiveBranch(data: Github.Type.ActiveBranches, reqCtx: Other.Type.RequestCtx, processId?: string): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    await dynamodbClient.put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    await esClientObj.putDocument(Github.Enums.IndexName.GitActiveBranches, data);
    logger.info({ message: 'saveActiveBranchDetails.successful', requestId, resourceId});
    await deleteProcessfromDdb(processId,{requestId, resourceId});
  } catch (error: unknown) {
    logger.error({ message: 'saveActiveBranchDetails.error', error, requestId, resourceId});
    throw error;
  }
}
