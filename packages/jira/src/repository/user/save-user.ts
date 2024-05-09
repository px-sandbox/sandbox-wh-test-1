import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { deleteProcessfromDdb } from '../../util/delete-process';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { deleteProcessfromDdb } from 'rp';

/**
 * Saves the user details to DynamoDB and Elasticsearch.
 * @param data The user details to be saved.
 * @returns A Promise that resolves when the user details have been saved successfully.
 * @throws An error if there was an issue saving the user details.
 */
const esClientObj = ElasticSearchClient.getInstance();
export async function saveUserDetails(
  data: Jira.Type.User,
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
    logger.info({
      requestId,
      resourceId,
      message: 'saveUserDetails.matchQry------->',
      data: { matchQry },
    });
    const userData = await esClientObj.search(Jira.Enums.IndexName.Users, matchQry);
    const [formattedData] = await searchedDataFormatorWithDeleted(userData);
    if (formattedData) {
      updatedData.id = formattedData._id;
    }
    await esClientObj.putDocument(Jira.Enums.IndexName.Users, updatedData);
    logger.info({ requestId, resourceId, message: 'saveUserDetails.successful' });
    await deleteProcessfromDdb(processId);
  } catch (error: unknown) {
    logger.error({ requestId, resourceId, message: 'saveUserDetails.error', error });
    throw error;
  }
}
