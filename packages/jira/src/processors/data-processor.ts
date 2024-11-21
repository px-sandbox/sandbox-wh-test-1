import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { Queue } from 'sst/node/queue';
import { ParamsMapping } from '../model/params-mapping';
import { generateUuid } from 'src/util/response-formatter';

/**
 * Abstract class for processing Jira API data.
 * @template T - Type of Jira API data.
 * @template S - Type of processed data.
 */
export abstract class DataProcessor<T, S> {
  protected DynamoDbDocClient: DynamoDbDocClient;
  protected SQSClient: SQSClient;
  public formattedData: S;
  /**
   * Constructor for DataProcessor class.
   * @param data - Jira API data to be processed.
   */
  constructor(
    protected apiData: T,
    public requestId: string,
    public resourceId: string,
    protected eventType: string,
    protected retryProcessId?: string
  ) {
    this.DynamoDbDocClient = DynamoDbDocClient.getInstance();
    this.SQSClient = SQSClient.getInstance();
    this.formattedData = {} as S;
  }

  /**
   * Validates the Jira API data.
   * @returns Returns the DataProcessor instance if the data is not undefined, else returns false.
   */
  public validate(): void {
    try {
      // Check if the input is an object and not null or an array
      if (
        this.apiData === null ||
        typeof this.apiData !== 'object' ||
        Array.isArray(this.apiData)
      ) {
        throw new Error('DataProcessor.type.validate.error');
      }

      // Check if all entries in the object have string keys and valid values
      const check = Object.entries(this.apiData).every(
        ([key, value]) =>
          typeof key === 'string' &&
          (typeof value === 'string' || typeof value === 'number' || Array.isArray(value))
      );
      if (!check) {
        throw new Error('DataProcessor.entries.validate.error');
      }
    } catch (error) {
      logger.error({ message: 'DataProcessor.validate.error', error });
      throw error;
    }
  }

  /**
   * Abstract method for processing the Jira API data.
   * @param id - ID of the Jira API data.
   * @returns Returns the processed data.
   */
  public abstract process(id: string): Promise<void>;

  /**
   * Gets the parent ID of the Jira API data from DynamoDB.
   * @param id - ID of the Jira API data.
   * @returns Returns the parent ID of the Jira API data.
   */
  public async getParentId(id: string): Promise<string> {
    const ddbRes = await this.DynamoDbDocClient.find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string;
  }

  /**
   * Sends data to an SQS queue.
   * @param data - Data to be sent to the queue.
   * @param url - URL of the SQS queue.
   */
  public async save(): Promise<void> {
    if (Object.keys(this.formattedData as Record<string, any>).length === 0) {
      logger.error({
        message: 'DataProcessor.save.error: EMPTY_FORMATTED_DATA',
        data: {
          requestId: this.requestId,
          resourceId: this.resourceId,
          eventType: this.eventType,
          retryProcessId: this.retryProcessId,
        },
      });
      throw new Error('DataProcessor.save.error: EMPTY_FORMATTED_DATA');
    }
    await this.SQSClient.sendMessage(
      { data: this.formattedData, index: this.eventType, processId: this.retryProcessId },
      Queue.qJiraIndex.queueUrl,
      {
        requestId: this.requestId,
        resourceId: this.resourceId,
      }
    );
  }

  public async putDataToDynamoDB(parentId: string, jiraId: string): Promise<void> {
    await this.DynamoDbDocClient.put(new ParamsMapping().preparePutParams(parentId, jiraId));
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
