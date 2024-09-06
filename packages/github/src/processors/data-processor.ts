import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import moment from 'moment';
import { Queue } from 'sst/node/queue';
import { ParamsMapping } from '../model/params-mapping';
import { generateUuid } from '../util/response-formatter';

export abstract class DataProcessor<T, S> {
  private SQSClient: SQSClient;
  protected DynamoDbDocClient: DynamoDbDocClient;
  public formattedData: S;

  constructor(
    protected ghApiData: T,
    public requestId: string,
    public resourceId: string,
    protected eventType: string | null,
    protected retryProcessId: string | null
  ) {
    this.SQSClient = SQSClient.getInstance();
    this.DynamoDbDocClient = DynamoDbDocClient.getInstance();
    this.formattedData = {} as S;
  }

  public validate(): DataProcessor<T, S> | false {
    if (this.ghApiData !== undefined) {
      return this;
    }
    logger.error({ message: 'DataProcessor.validate.error: EMPTY_DATA', data: this.ghApiData });
    return false;
  }

  public abstract process(id: string): Promise<void>;

  public async getParentId(id: string): Promise<string> {
    const ddbRes = await this.DynamoDbDocClient.find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string;
  }

  public async save(): Promise<void> {
    if (Object.keys(this.formattedData as Record<string, any>).length === 0) {
      logger.error({ message: 'DataProcessor.save.error: EMPTY_FORMATTED_DATA' });
      throw new Error('DataProcessor.save.error: EMPTY_FORMATTED_DATA');
    }
    await this.SQSClient.sendMessage(
      { data: this.formattedData, eventType: this.eventType, processId: this.retryProcessId },
      Queue.qGhIndex.queueUrl,
      {
        requestId: this.requestId,
        resourceId: this.resourceId,
      }
    );
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

  public async parentId(id: string): Promise<string> {
    let parentId: string = await this.getParentId(id);
    if (!parentId) {
      parentId = generateUuid();
      await this.putDataToDynamoDB(parentId, id);
    }
    return parentId;
  }
}
