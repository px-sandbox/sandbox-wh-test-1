import esb from 'elastic-builder';
import { DynamoDbDocClient } from '@pulse/dynamodb';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import { logger } from 'core';
import { Config } from 'sst/node/config';
import { searchedDataFormator } from '../../util/response-formatter';
import { ParamsMapping } from '../../model/params-mapping';

/**
 * Saves the details of a Jira board to DynamoDB and Elasticsearch.
 * @param data The board data to be saved.
 * @returns A Promise that resolves when the board details have been saved.
 * @throws An error if there was a problem saving the board details.
 */
export async function saveBoardDetails(data: Jira.Type.Board): Promise<void> {
  try {
    const updatedData = { ...data };
    logger.info('saveBoardDetails.invoked');
    await new DynamoDbDocClient().put(new ParamsMapping().preparePutParams(data.id, data.body.id));
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', data.body.id).toJSON();
    logger.info('saveBoardDetails.matchQry------->', { matchQry });
    const boardData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Board, matchQry);
    const [formattedData] = await searchedDataFormator(boardData);
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
