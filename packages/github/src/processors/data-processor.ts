import moment from 'moment';
import { DynamoDbDocClient, DynamoDbDocClientGh } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';
import { Queue } from 'sst/node/queue';

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
    const dynamodbClient = DynamoDbDocClientGh.getInstance();
    const ddbRes = await dynamodbClient.find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string;
  }

  public async indexDataToES<U>(data: U): Promise<void> {
    await new SQSClient().sendMessage(data, Queue.qGhIndex.queueUrl);
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
    const dynamodbClient = DynamoDbDocClientGh.getInstance();
    await dynamodbClient.put(new ParamsMapping().preparePutParams(parentId, githubId));
  }
}
