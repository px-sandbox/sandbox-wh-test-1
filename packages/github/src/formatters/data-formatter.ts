import { logger } from 'core';

export abstract class DataFormatter<T, S> {
  protected ghApiData: T;

  constructor(data: T) {
    this.ghApiData = data;
  }

  public validate(): DataFormatter<T, S> | false {
    if (this.ghApiData != undefined) {
      return this;
    }
    logger.error({ message: 'EMPTY_DATA', data: this.ghApiData });
    return false;
  }

  abstract formatter(id: string): S;
}
