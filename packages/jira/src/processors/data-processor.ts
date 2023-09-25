import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Config } from 'sst/node/config';
import { Jira } from 'abstraction';
import { ParamsMapping } from '../model/params-mapping';

/**
 * Abstract class for processing Jira API data.
 * @template T - Type of Jira API data.
 * @template S - Type of processed data.
 */
export abstract class DataProcessor<T, S> {
  protected jiraApiData: T;

  /**
   * Constructor for DataProcessor class.
   * @param data - Jira API data to be processed.
   */
  constructor(data: T) {
    this.jiraApiData = data;
  }

  /**
   * Validates the Jira API data.
   * @returns Returns the DataProcessor instance if the data is not undefined, else returns false.
   */
  public validate(): DataProcessor<T, S> | false {
    if (this.jiraApiData !== undefined) {
      return this;
    }
    logger.error({ message: 'EMPTY_DATA', data: this.jiraApiData });
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
  public async getParentId(id: string): Promise<string|undefined> {
    const ddbRes = await new DynamoDbDocClient().find(new ParamsMapping().prepareGetParams(id));

    return ddbRes?.parentId as string|undefined;
  }

  /**
   * Sends data to an SQS queue.
   * @param data - Data to be sent to the queue.
   * @param url - URL of the SQS queue.
   */
  public async sendDataToQueue<U>(data: U, url: string): Promise<void> {
    await new SQSClient().sendMessage(data, url);
  }

  /**
   * Gets the organization ID from ElasticSearch.
   * @param orgName - Name of the organization.
   * @returns Returns the organization ID.
   */
  public async getOrganizationId(orgName: string): Promise<Jira.Type.Organization> {
    const _esClient = new ElasticSearchClient({
      host: Config.OPENSEARCH_NODE,
      username: Config.OPENSEARCH_USERNAME ?? '',
      password: Config.OPENSEARCH_PASSWORD ?? '',
    });
    const organization: any = await _esClient.search(
      Jira.Enums.IndexName.Organization,
      'name',
      orgName
    );
    return organization.hits.hits[0]._source;
  }
}
