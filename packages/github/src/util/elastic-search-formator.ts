import { logger } from 'core';

export class ElasticSearchFormator {
  public async exportActualResult(result: any): Promise<void> {
    try {
      const filteredArray: any = [];
      const dataLength = result.hits.hits.length;
      for (let i = 0; i < dataLength; i += 1) {
        if (result.hits.hits[i]) {
          const data = result.hits.hits[i]._source;
          if (Object.keys(data).length) {
            filteredArray.push(data);
          }
        }
      }
      return filteredArray;
    } catch (error) {
      logger.error({
        error,
      });
      throw error;
    }
  }
}
