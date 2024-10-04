import { logger } from 'core';
const mockData = [
  { repoId: 123456, value: 1, date: '2024-09-01' },
  { repoId: 1236345, value: 11, date: '2024-09-02' },
  { repoId: 123456, value: 21, date: '2024-09-03' },
  { repoId: 1236345, value: 31, date: '2024-09-04' },
  { repoId: 123456, value: 14, date: '2024-09-05' },
  { repoId: 12345226, value: 51, date: '2024-09-06' },
  { repoId: 1234556, value: 19, date: '2024-09-07' },
];

export const getData = async (
  repoIds: string[],
  startDate: string,
  endDate: string,
  page: number,
  limit: number
): Promise<{ data: {value: number; date: string }[] }> => {
  try {
    const filteredData = mockData.filter(
      (item) =>
        repoIds.includes(item.repoId.toString()) && item.date >= startDate && item.date <= endDate
    );
    const startIndex = (page - 1) * limit;
    const paginatedData = filteredData.slice(startIndex, startIndex + limit);
    const responseData = paginatedData.map(({ value, date }) => ({ value, date }));
    return { data: responseData };
  } catch (e) {
    logger.error({ message: 'getData.error', error: `${e}` });
    throw e;
  }
};