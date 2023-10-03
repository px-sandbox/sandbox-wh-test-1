import { Jira } from 'abstraction';

export function mappingToApiData(
  user: Jira.ExternalType.Api.User,
  createdAt: string,
  organization: string,
  deletedAt: string | null
): Jira.Mapper.User {
  return {
    ...user,
    isDeleted: !!deletedAt,
    deletedAt,
    createdAt,
    organization,
  };
}
