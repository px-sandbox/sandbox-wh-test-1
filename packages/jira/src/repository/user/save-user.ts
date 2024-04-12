import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'src/util/delete-process';

/**
 * Saves the user details to DynamoDB and Elasticsearch.
 * @param data The user details to be saved.
 * @returns A Promise that resolves when the user details have been saved successfully.
 * @throws An error if there was an issue saving the user details.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveUserDetails(data: Jira.Type.User, processId?: string): Promise<void> {
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
    logger.info('saveUserDetails.matchQry------->', { matchQry });
    const userData = await esClientObj.search(Jira.Enums.IndexName.Users, matchQry);
    const [formattedData] = await searchedDataFormatorWithDeleted(userData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Users, updatedData);
    logger.info('saveUserDetails.successful');
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error('saveUserDetails.error', {
      error,
    });
    throw error;
  }
}
