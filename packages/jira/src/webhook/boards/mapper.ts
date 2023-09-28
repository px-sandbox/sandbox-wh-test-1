import { Jira } from 'abstraction';

export function mappingToApiData(
  board: Jira.ExternalType.Webhook.Board,
  created: string,
  org: string
): Jira.Type.Board {
  return {
    id: board.id,
    self: board.self,
    name: board.name,
    type: board.type,
    createdAt: created,
    organization: org,
  };
}
