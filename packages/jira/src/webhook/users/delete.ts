import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { getUserById } from '../../repository/user/get-user';
import { saveUserDetails } from '../../repository/user/save-user';

/**
 * Deletes a user by their ID and sets the `isDeleted` and `deletedAt` properties in their user data.
 * @param userId - The ID of the user to delete.
 * @param eventTime - The time the user was deleted.
 * @param organization - The organization the user belongs to.
 * @returns A Promise that resolves with `void` if the user was successfully deleted,
 * or `false` if the user was not found.
 */
export async function deleteUser(
  userId: string,
  eventTime: moment.Moment,
  organization: string
): Promise<void | false> {
  const userData = await getUserById(userId, organization);
  if (!userData) {
    logger.info('userDeletedEvent: User not found');
    return false;
  }
  const { _id, ...processUserData } = userData;

  processUserData.isDeleted = true;
  processUserData.deletedAt = moment(eventTime).toISOString();

  logger.info(`userDeletedEvent: Delete User id ${_id}`);
  await saveUserDetails({ id: _id, body: processUserData } as Jira.Type.User);
}
