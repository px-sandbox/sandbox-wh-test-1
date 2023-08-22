import { logger } from 'core';

export class ElasticSearchFormator {
  public async exportActualResult(result: any): Promise<void> {
    try {
      const filteredArray: any = [];

      result.hits.hits.forEach((hit: { _source: any }) => {
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
