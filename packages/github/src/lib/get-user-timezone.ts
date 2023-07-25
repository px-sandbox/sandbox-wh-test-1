import { logger } from 'core';
import { getUserById } from './get-user';

export async function getTimezoneOfUser(userId: string): Promise<string> {
  const [user] = await getUserById(userId);
  let userTZ = user.timezone;
  if (!userTZ) {
    logger.info('TIMEZONE_NOT_FOUND: ', { userId });
    userTZ = '+05:30'; // Default timezone
  }
  return userTZ;
}
