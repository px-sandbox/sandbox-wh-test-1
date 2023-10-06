import { Jira } from 'abstraction';

export function mappingToApiData(
  user: Jira.ExternalType.Webhook.User,
  createdAt: string,
  organization: string,
  deletedAt: string | null = null
): Jira.Mapper.User {
  return {
    ...user,
    isDeleted: !!deletedAt,
    deletedAt,
    createdAt,
    organization,
  };
}
