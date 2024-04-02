import AWS_SQS, { SQS } from '@aws-sdk/client-sqs';
import { logger } from 'core';
import { ISQSClient } from '../types';

export class SQSClient implements ISQSClient {
  private sqs: SQS;
  private static instance: SQSClient;

  private constructor() {
    this.sqs = new SQS();
  }

  public static getInstance(): SQSClient {
    if (!SQSClient.instance) {
      SQSClient.instance = new SQSClient();
    }
    return SQSClient.instance;
  }

  public async sendFifoMessage<T>(
    message: T,
    queueUrl: string,
    messageGroupId: string,
    messageDeduplicationId: string,
    delay?: number
  ): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      const queueObj: AWS_SQS.SendMessageCommandInput = {
        MessageBody: JSON.stringify(message),
        QueueUrl: queueUrl,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageDeduplicationId,
        DelaySeconds: delay,
      };
      await this.sqs.sendMessage(queueObj);
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error, queueName });
    }
  }

  public async sendMessage<T>(
    message: T,
    queueUrl: string,
    messageGroupId?: string,
    MessageDeduplicationId?: string
  ): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      let queueObj: AWS_SQS.SendMessageCommandInput = {
        MessageBody: JSON.stringify(message),
        QueueUrl: queueUrl,
      };

      if (messageGroupId) {
        queueObj = {
          ...queueObj,
          MessageGroupId: messageGroupId,
          MessageDeduplicationId,
        };
      }
      await this.sqs.sendMessage(queueObj);
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error, queueName });
    }
  }
}
