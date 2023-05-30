import { DynamoDbDocClient } from '@pulse/dynamodb';
import { SQSClient } from '@pulse/event-handler';
import { logger } from 'core';
import { region } from 'src/constant/config';
import { ParamsMapping } from 'src/model/params-mapping';
import { Config } from 'sst/node/config';

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

  abstract formatter(id: string): Promise<S>;

  public async getParentId(id: string) {
    const ddbRes = await new DynamoDbDocClient(region, Config.STAGE).find(
      new ParamsMapping().prepareGetParams(id)
    );

    return ddbRes?.parentId;
  }

  public async sendDataToQueue(data: Object, url: string) {
    await new SQSClient().sendMessage(data, url);
  }
}
