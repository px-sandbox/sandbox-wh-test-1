import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { ParamsMapping } from '../model/params-mapping';

export abstract class DataProcessor<T, S> {
  private SQSClient: SQSClient;
  protected DynamoDbDocClient: DynamoDbDocClient;
  constructor(protected ghApiData: T, public requestId: string, public resourceId: string) {
    this.SQSClient = SQSClient.getInstance();
    this.DynamoDbDocClient = DynamoDbDocClient.getInstance();
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
    const ddbRes = await this.DynamoDbDocClient.find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string;
  }

  public async save<U>(data: U): Promise<void> {
    const validated = this.validate();
    if (!validated) {
      throw new Error('data_validation_failed');
    }
    await this.SQSClient.sendMessage(data, Queue.qGhIndex.queueUrl);
  }

  public async calculateComputationalDate(date: string): Promise<string> {
    const inputDay = moment(date).format('dddd');
    if (inputDay === 'Saturday') {
      return moment(date).add(2, 'days').format('YYYY-MM-DD');
    }
    if (inputDay === 'Sunday') {
      return moment(date).add(1, 'days').format('YYYY-MM-DD');
    }
    return moment(date).format('YYYY-MM-DD');
  }

  public async putDataToDynamoDB(parentId: string, githubId: string): Promise<void> {
    await this.DynamoDbDocClient.put(new ParamsMapping().preparePutParams(parentId, githubId));
  }
}
