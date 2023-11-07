import esb from 'elastic-builder';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves a Jira board by its ID.
 * @param boardId The ID of the board to retrieve.
 * @returns A promise that resolves with the board data.
 * @throws An error if the board cannot be retrieved.
 */
export async function getBoardById(boardId: number, organization: string): Promise<Other.Type.HitBody> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${mappingPrefixes.board}_${boardId}`),
        esb.termQuery('body.organizationId', `${orgData.id}`),
      ])
      .toJSON();
    const boardData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Board, matchQry);
    const [formattedBoardData] = await searchedDataFormatorWithDeleted(boardData);
    return formattedBoardData;
  } catch (error: unknown) {
    logger.error('getBoardById.error', { error });
    throw error;
  }
}

/**
 * Retrieves a Jira board by orginazationId.
 * @param boardId The ID of the board to retrieve.
 * @param organizationId The ID of the organization to retrieve.
 * @returns A promise that resolves with the board data.
 * @throws An error if the board cannot be retrieved.
 */
export async function getBoardByOrgId(
  boardId: number,
  organizationId: string
): Promise<Other.Type.HitBody> {
  try {
    const esClientObj = await new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });

    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${boardId}`),
        esb.termQuery('body.organizationId', `${organizationId}`),
      ])
      .toJSON();
    const boardData = await esClientObj.searchWithEsb(Jira.Enums.IndexName.Board, matchQry);
    const [formattedBoardData] = await searchedDataFormatorWithDeleted(boardData);
    return formattedBoardData;
  } catch (error: unknown) {
    logger.error('getBoardById.error', { error });
    throw error;
  }
}
