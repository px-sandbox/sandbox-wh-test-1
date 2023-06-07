import { SQS } from 'aws-sdk';
import { ISQSClient } from '../types';
import { logger } from 'core';
export class SQSClient implements ISQSClient {
  private sqs: SQS;

  constructor() {
    this.sqs = new SQS();
  }

  public async sendMessage(message: Object, queueUrl: string): Promise<void> {
    try {
      const res = await this.sqs
        .sendMessage({
          MessageBody: JSON.stringify(message),
          QueueUrl: queueUrl,
        })
        .promise();
      logger.info({ message: 'SQS_SEND_MESSAGE_RESPONSE', res });
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error });
    }
  }
}
