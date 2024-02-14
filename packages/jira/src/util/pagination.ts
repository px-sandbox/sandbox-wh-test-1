/**
 * Paginates an array of data.
 *
 * @param data - The array of data to be paginated.
 * @param page - The page number to retrieve.
 * @param limit - The maximum number of items per page.
 * @returns A promise that resolves to the paginated array of data.
 */
export async function paginate<T>(data: T[], page: number, limit: number): Promise<T[]> {
  const start = (page - 1) * limit;
  const end = page * limit;
  return data.slice(start, end);
}
