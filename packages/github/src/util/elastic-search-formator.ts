import { logger } from 'core';

export type HitSource = {
  [key: string]: unknown;
};

export type Result = {
  hits: { hits: { _source: Record<string, unknown> }[] };
};
export class ElasticSearchFormator {
  public async exportActualResult(result: Result): Promise<HitSource[]> {
    try {
      const filteredArray: HitSource[] = [];

      result.hits.hits.forEach((hit: { _source: Record<string, unknown> }) => {
        if (hit) {
          const data = hit._source;
          if (Object.keys(data).length) {
            filteredArray.push(data);
          }
        }
      });
      return filteredArray;
    } catch (error) {
      logger.error({
        error,
      });
      throw error;
    }
  }
}
