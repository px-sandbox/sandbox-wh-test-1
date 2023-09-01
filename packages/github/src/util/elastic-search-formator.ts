import { logger } from 'core';
import { Other } from 'abstraction';

export class ElasticSearchFormator {
  public async exportActualResult(result: Other.Type.Result): Promise<Other.Type.HitSource[]> {
    try {
      const filteredArray: Other.Type.HitSource[] = [];

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
