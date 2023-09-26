import { logger } from 'core';
import moment from 'moment';
import { Jira } from 'abstraction';
import { getUserById } from '../../repository/get-user';
import { saveUserDetails } from '../../repository/save-user';

export async function userDeletedEvent(
  userId: string,
  eventTime: moment.Moment
): Promise<void | false> {
  const userData = await getUserById(userId);
  if (!userData) {
    logger.info('userDeletedEvent: User not found');
    return false;
  }
  const { _id, ...processUserData } = userData;

  processUserData.isDeleted = true;
  processUserData.deletedAt = moment(eventTime).format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

  logger.info(`userDeletedEvent: Delete User id ${_id}`);
  await saveUserDetails({ id: _id, body: processUserData } as Jira.Type.User);
}
