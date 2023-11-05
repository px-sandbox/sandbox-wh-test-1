import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ParamsMapping } from '../model/params-mapping';


/**
 * Abstract class for processing Jira API data.
 * @template T - Type of Jira API data.
 * @template S - Type of processed data.
 */
export abstract class DataProcessor<T, S> {
  protected apiData: T;

  /**
   * Constructor for DataProcessor class.
   * @param data - Jira API data to be processed.
   */
  constructor(data: T) {
    this.apiData = data;
  }

  /**
   * Validates the Jira API data.
   * @returns Returns the DataProcessor instance if the data is not undefined, else returns false.
   */
  public validate(): this | false {
    if (this.apiData !== undefined) {
      return this;
    }
    logger.error({ message: 'EMPTY_DATA', data: this.apiData });
    return false;
  }

  /**
   * Abstract method for processing the Jira API data.
   * @param id - ID of the Jira API data.
   * @returns Returns the processed data.
   */
  public abstract processor(id: string): Promise<S>;

  /**
   * Gets the parent ID of the Jira API data from DynamoDB.
   * @param id - ID of the Jira API data.
   * @returns Returns the parent ID of the Jira API data.
   */
  public async getParentId(id: string): Promise<string | undefined> {
    const ddbRes = await new DynamoDbDocClient().find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string | undefined;
  }

  /**
   * Sends data to an SQS queue.
   * @param data - Data to be sent to the queue.
   * @param url - URL of the SQS queue.
   */
  public async sendDataToQueue<U>(data: U, url: string): Promise<void> {
    await new SQSClient().sendMessage(data, url);
  }

}
