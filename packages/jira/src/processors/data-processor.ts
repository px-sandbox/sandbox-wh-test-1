import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';

export abstract class DataProcessor<T, S> {
  protected jiraApiData: T;

  constructor(data: T) {
    this.jiraApiData = data;
  }

  public validate(): DataProcessor<T, S> | false {
    if (this.jiraApiData !== undefined) {
      return this;
    }
    logger.error({ message: 'EMPTY_DATA', data: this.jiraApiData });
    return false;
  }

  public abstract processor(id: string): Promise<S>;

  public async getParentId(id: string): Promise<string> {
    const ddbRes = await new DynamoDbDocClient().find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId;
  }

  public async sendDataToQueue<U>(data: U, url: string): Promise<void> {
    await new SQSClient().sendMessage(data, url);
  }
}
