import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { searchedDataFormator } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

/**
 * Saves the issue status details to DynamoDB and Elasticsearch.
 * @param data The issue status data to be saved.
 * @returns A Promise that resolves when the data is saved successfully.
 * @throws An error if there is an issue with saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveIssueStatusDetails(data: Jira.Type.IssueStatus, processId?: string): Promise<void> {
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
    logger.info('saveIssueStatusDetails.successful');
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error('saveIssueStatusDetails.error', {
      error,
    });
    throw error;
  }
}
