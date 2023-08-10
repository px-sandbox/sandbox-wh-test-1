import { SQS } from 'aws-sdk';
import { logger } from 'core';
import { ISQSClient } from '../types';

export class SQSClient implements ISQSClient {
  private sqs: SQS;

  constructor() {
    this.sqs = new SQS();
  }

  public async sendMessage<T>(message: T, queueUrl: string, delay?: number): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      const res = await this.sqs
        .sendMessage({
          MessageBody: JSON.stringify(message),
          QueueUrl: queueUrl,
          DelaySeconds: delay,
        })
        .promise();
      logger.info({
        message: 'SQS_SEND_MESSAGE_RESPONSE',
        res,
        queueName,
        delay,
      });
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error, queueName });
    }
  }
}
