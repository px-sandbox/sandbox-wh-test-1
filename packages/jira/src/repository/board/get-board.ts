import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import { logger } from 'core';
import esb from 'elastic-builder';
import { mappingPrefixes } from '../../constant/config';
import { searchedDataFormatorWithDeleted } from '../../util/response-formatter';
import { getOrganization } from '../organization/get-organization';

/**
 * Retrieves a Jira board by its ID.
 * @param boardId The ID of the board to retrieve.
 * @returns A promise that resolves with the board data.
 * @throws An error if the board cannot be retrieved.
 */
const esClientObj = ElasticSearchClient.getInstance();  
export async function getBoardById(boardId: number, organization: string): Promise<Other.Type.HitBody> {
  try {
    const orgData = await getOrganization(organization);
    if (!orgData) {
      logger.error(`Organization ${organization} not found`);
      throw new Error(`Organization ${organization} not found`);
    }
    const matchQry = esb
      .requestBodySearch().query(esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${mappingPrefixes.board}_${boardId}`),
        esb.termQuery('body.organizationId', `${orgData.id}`),
      ]))
      .toJSON();
    const boardData = await esClientObj.search(Jira.Enums.IndexName.Board, matchQry);
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
    const matchQry = esb
      .boolQuery()
      .must([
        esb.termsQuery('body.id', `${boardId}`),
        esb.termQuery('body.organizationId', `${organizationId}`),
      ])
      .toJSON();
    const boardData = await esClientObj.search(Jira.Enums.IndexName.Board, matchQry);
    const [formattedBoardData] = await searchedDataFormatorWithDeleted(boardData);
    return formattedBoardData;
  } catch (error: unknown) {
    logger.error('getBoardById.error', { error });
    throw error;
  }
}
