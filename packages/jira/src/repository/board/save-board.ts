import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';

/**
 * Saves the details of a Jira board to DynamoDB and Elasticsearch.
 * @param data The board data to be saved.
 * @returns A Promise that resolves when the board details have been saved.
 * @throws An error if there was a problem saving the board details.
 */
const esClientObj = ElasticSearchClient.getInstance();

export async function saveBoardDetails(data: Jira.Type.Board): Promise<void> {
  try {
    const updatedData = { ...data };

    logger.info('saveBoardDetails.invoked');

    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', data.body.id),
        esb.termQuery('body.organizationId', data.body.organizationId),
      ])
      .toJSON();
    logger.info('saveBoardDetails.matchQry------->', { matchQry });
    const boardData = await esClientObj.search(Jira.Enums.IndexName.Board, matchQry);
    const [formattedData] = await searchedDataFormatorWithDeleted(boardData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Board, updatedData);
    logger.info('saveBoardDetails.successful');
  } catch (error: unknown) {
    logger.error('saveBoardDetails.error', {
      error,
    });
    throw error;
  }
}
