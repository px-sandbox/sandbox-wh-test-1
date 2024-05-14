import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { deleteProcessfromDdb } from 'rp';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';

/**
 * Saves the details of a Jira board to DynamoDB and Elasticsearch.
 * @param data The board data to be saved.
 * @returns A Promise that resolves when the board details have been saved.
 * @throws An error if there was a problem saving the board details.
 */
const esClientObj = ElasticSearchClient.getInstance();

export async function saveBoardDetails(
  data: Jira.Type.Board,
  reqCtx: Other.Type.RequestCtx,
  processId?: string
): Promise<void> {
  const { requestId, resourceId } = reqCtx;
  try {
    const { ...updatedData } = data;

    logger.info({ requestId, resourceId, message: 'saveBoardDetails.invoked' });

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
    logger.info({
      requestId,
      resourceId,
      message: 'saveBoardDetails.matchQry------->',
      data: { matchQry },
    });
    const boardData = await esClientObj.search(Jira.Enums.IndexName.Board, matchQry);
    const [formattedData] = await searchedDataFormatorWithDeleted(boardData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Board, updatedData);
    logger.info({ requestId, resourceId, message: 'saveBoardDetails.successful' });
    await deleteProcessfromDdb(processId, reqCtx);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: 'saveBoardDetails.error', error });
    throw error;
  }
}
