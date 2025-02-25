import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from 'rp';
/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveIssueDetails(
  data: Jira.Type.Issue,
  reqCtx: Other.Type.RequestCtx
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    await esClientObj.putDocument(Jira.Enums.IndexName.Issue, updatedData);
    logger.info({ requestId, resourceId, message: 'saveIssueDetails.successful' });
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: `saveIssueDetails.error: ${error}` });
    throw error;
  }
}
