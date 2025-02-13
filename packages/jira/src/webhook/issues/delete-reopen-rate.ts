import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { searchedDataFormator } from 'src/util/response-formatter';
import { mappingPrefixes } from '../../constant/config';

const esClientObj = ElasticSearchClient.getInstance();
/**
 * Removes the reopen issue with the given ID and marks it as deleted.
 * @param issueId - The ID of the issue to be removed.
 * @param eventTime - The time when the issue was deleted.
 * @param organization - The organization the issue belongs to.
 * @returns A Promise that resolves with void if the issue was successfully removed,
 *  or false if the issue was not found.
 */
export async function removeReopenRate(
  issueId: string,
  eventTime: string,
  reqCtx: Other.Type.RequestCtx
): Promise<void | false> {
  try {
    const query = esb
      .requestBodySearch()
      .query(
        esb.boolQuery().must([esb.termQuery('body.issueId', `${mappingPrefixes.issue}_${issueId}`)])
      )
      .toJSON();
    const reopenRes = await esClientObj.search(Jira.Enums.IndexName.ReopenRate, query);
    const [reopenData] = await searchedDataFormator(reopenRes);
    if (!reopenData) {
      logger.info({ ...reqCtx, message: 'removeReopenRate.error', error: 'Issue not found' });
      return;
    }
    await esClientObj.updateDocument(Jira.Enums.IndexName.ReopenRate, reopenData._id, {
      body: {
        isDeleted: true,
        deletedAt: eventTime,
      },
    });
  } catch (error) {
    logger.error({ ...reqCtx, message: 'removeReopenRate.error', error: `${error}` });
  }
}
