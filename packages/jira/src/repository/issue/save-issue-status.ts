import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from '../../util/delete-process';
import { searchedDataFormator } from '../../util/response-formatter';

/**
 * Saves the issue status details to DynamoDB and Elasticsearch.
 * @param data The issue status data to be saved.
 * @returns A Promise that resolves when the data is saved successfully.
 * @throws An error if there is an issue with saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveIssueStatusDetails(
  data: Jira.Type.IssueStatus,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const updatedData = { ...data };
    const matchQry = esb
      .requestBodySearch()
      .query(
        esb
          .boolQuery()
          .must([
            esb.termsQuery('body.id', data.body.id),
            esb.termQuery('body.organizationId', data.body.organizationId),
          ])
      )
      .toJSON();
    const issueStatusData = await esClientObj.search(Jira.Enums.IndexName.IssueStatus, matchQry);
    const [formattedData] = await searchedDataFormator(issueStatusData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.IssueStatus, updatedData);
    logger.info({ requestId, resourceId, message: 'saveIssueStatusDetails.successful' });
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: 'saveIssueStatusDetails.error', error });
    throw error;
  }
}
