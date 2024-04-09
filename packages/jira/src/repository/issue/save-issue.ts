import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { searchedDataFormator } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';
/**
 * Saves the details of a Jira issue to DynamoDB and Elasticsearch.
 * @param data The issue data to be saved.
 * @returns A Promise that resolves when the data has been saved successfully.
 * @throws An error if there was a problem saving the data.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveIssueDetails(data: Jira.Type.Issue): Promise<void> {
  try {
    const { processId, ...updatedData } = data;
    const matchQry = esb.requestBodySearch().query(
      esb.boolQuery().must([
        esb.termsQuery('body.id', data.body.id),
        esb.termQuery('body.organizationId.keyword', data.body.organizationId),
      ]))
      .toJSON();
    const issueData = await esClientObj.search(Jira.Enums.IndexName.Issue, matchQry);
    const [formattedData] = await searchedDataFormator(issueData);
    if (formattedData) {
      updatedData.id = formattedData._id;
      updatedData.body.changelog = [...formattedData.changelog, ...data.body.changelog];  
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Issue, updatedData);
    logger.info('saveIssueDetails.successful');
    if (processId) {
      logger.info('deleting_process_from_DDB', { processId });
      await deleteProcessfromDdb(processId);
    }
  } catch (error: unknown) {
    logger.error(`saveIssueDetails.error: ${error}`);
    throw error;
  }
}
