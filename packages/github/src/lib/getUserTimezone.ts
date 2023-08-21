import { getUserById } from './getUser';

export async function getTimezoneOfUser(userId: string): Promise<string> {
  const [user] = await getUserById(userId);

  return user?.timezone ?? '+05:30';
}
