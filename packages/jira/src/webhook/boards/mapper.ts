import { Jira } from 'abstraction';

/**
 * Maps a Jira API board object to a mapper board object.
 * @param board - The Jira API board object to map.
 * @param createdAt - The timestamp when the board was created.
 * @param organization - The name of the organization that the board belongs to.
 * @param deletedAt - The timestamp when the board was deleted, if it has been deleted.
 * @returns The mapper board object.
 */
export function mappingToApiData(
  board: Jira.ExternalType.Webhook.Board,
  createdAt: string,
  organization: string,
  deletedAt: string | null = null
): Jira.Mapper.Board {
  return {
    id: board.id,
    self: board.self,
    name: board.name,
    isDeleted: !!deletedAt,
    deletedAt,
    createdAt,
    organization,
  };
}

/**
 * Maps the board configuration data received from Jira API to the format expected by the application.
 * @param config - The board configuration data received from Jira API.
 * @param boardIndexData - The board index data received from Jira API.
 * @param organization - The name of the organization to which the board belongs.
 * @param deletedAt - The timestamp at which the board was deleted, if it has been deleted.
 * @returns The board data in the format expected by the application.
 */
export function mappingToApiDataConfig(
  config: Jira.ExternalType.Webhook.BoardConfig,
  boardIndexData: { [key: string]: any }, // eslint-disable-line @typescript-eslint/no-explicit-any
  organization: string,
  deletedAt: string | null = null
): Jira.Mapper.Board {
  const { boardId, self, name, type, location, createdAt } = boardIndexData;
  return {
    id: boardId,
    self,
    name,
    type,
    location,
    filter: config.filter,
    columnConfig: config.columnConfig,
    ranking: config.ranking,
    isDeleted: !!deletedAt,
    deletedAt,
    createdAt,
    organization,
  };
}
