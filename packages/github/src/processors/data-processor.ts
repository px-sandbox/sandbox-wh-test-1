import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';
import moment from 'moment';

export abstract class DataProcessor<T, S> {
  protected ghApiData: T;

  constructor(data: T) {
    this.ghApiData = data;
  }

  public validate(): DataProcessor<T, S> | false {
    if (this.ghApiData !== undefined) {
      return this;
    }
    logger.error({ message: 'EMPTY_DATA', data: this.ghApiData });
    return false;
  }

  public abstract processor(id: string): Promise<S>;

  public async getParentId(id: string): Promise<string> {
    const ddbRes = await new DynamoDbDocClient().find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId;
  }

  public async sendDataToQueue(data: Object, url: string): Promise<void> {
    await new SQSClient().sendMessage(data, url);
  }

  public async calculateComputationalDate(date: string): Promise<string> {
    const inputDay = moment(date).format('dddd');
    if (inputDay === 'Saturday') {
      return moment(date).add(2, 'days').format('YYYY-MM-DD');
    } else if (inputDay === 'Sunday') {
      return moment(date).add(1, 'days').format('YYYY-MM-DD');
    }
    return moment(date).format('YYYY-MM-DD');
  }
}
