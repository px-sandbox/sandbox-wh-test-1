import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';

/**
 * Retrieves a Jira board by its ID.
 * @param boardId The ID of the board to retrieve.
 * @returns A promise that resolves with the board data.
 * @throws An error if the board cannot be retrieved.
 */
export async function getBoardById(boardId: number): Promise<Other.Type.HitBody> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const matchQry = esb.matchQuery('body.id', `${mappingPrefixes.board}_${boardId}`).toJSON();
    const boardData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Board, matchQry);
    const [formattedBoardData] = await searchedDataFormatorWithDeleted(boardData);
    return formattedBoardData;
  } catch (error: unknown) {
    logger.error('getBoardById.error', { error });
    throw error;
  }
}
