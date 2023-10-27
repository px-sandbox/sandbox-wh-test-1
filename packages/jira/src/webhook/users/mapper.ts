import { Jira } from 'abstraction';

/**
 * Maps the Jira webhook user data to the API user data.
 * @param user - The Jira webhook user data.
 * @param createdAt - The timestamp when the user was created.
 * @param organization - The organization to which the user belongs.
 * @param deletedAt - The timestamp when the user was deleted (optional).
 * @returns The mapped user data.
 */
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
