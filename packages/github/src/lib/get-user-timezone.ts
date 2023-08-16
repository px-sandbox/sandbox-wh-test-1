import { logger } from 'core';
import { getUserById } from './get-user';

export async function getTimezoneOfUser(userId: string): Promise<string> {
  const [user] = await getUserById(userId);

  return user?.timezone ?? '+05:30';
}
