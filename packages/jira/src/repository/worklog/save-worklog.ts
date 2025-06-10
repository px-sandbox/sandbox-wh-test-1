import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'rp';

/**
 * Saves the details of a Jira worklog to DynamoDB and Elasticsearch.
 * @param data The worklog data to be saved.
 * @returns A Promise that resolves when the worklog details have been saved.
 * @throws Throws an error if there was an issue saving the worklog details.
 */

const esClientObj = ElasticSearchClient.getInstance();

export async function saveWorklogDetails(
  data: Jira.Type.Worklog,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    await esClientObj.putDocument(Jira.Enums.IndexName.Worklog, data);
    logger.info({ requestId, resourceId, message: 'saveWorklogDetails.successful' });
    await deleteProcessfromDdb(processId, reqCtx);
  } catch (error: unknown) {
    logger.error({ data, message: 'saveWorklogDetails.error', error });
    throw error;
  }
}
