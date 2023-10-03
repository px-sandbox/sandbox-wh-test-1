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
  board: Jira.ExternalType.Api.Board,
  createdAt: string,
  organization: string,
  deletedAt: string | null
): Jira.Mapper.Board {
  return {
    id: board.id,
    self: board.self,
    name: board.name,
    type:
      board.type?.toLowerCase() === 'kanban'
        ? Jira.Enums.BoardType.Kanban
        : Jira.Enums.BoardType.Scrum,
    location: { ...board.location },
    isDeleted: !!deletedAt,
    deletedAt,
    createdAt,
    organization,
  };
}

export function mappingToApiDataConfig(
  config: Jira.ExternalType.Api.BoardConfig,
  boardIndexData: { [key: string]: any },
  organization: string,
  deletedAt: string | null
): Jira.Mapper.Board {
  const { id, self, name, type, location, createdAt } = boardIndexData;
  return {
    id,
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
