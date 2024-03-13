import AWS_SQS, { SQS } from '@aws-sdk/client-sqs';
import { logger } from 'core';
import { ISQSClient } from '../types';

export class SQSClientGh implements ISQSClient {
  private sqs: SQS;
  private static instance: SQSClientGh;

  private constructor() {
    this.sqs = new SQS();
  }

  public static getInstance(): SQSClientGh {
    if (!SQSClientGh.instance) {
      SQSClientGh.instance = new SQSClientGh();
    }
    return SQSClientGh.instance;
  }

  public async sendMessage<T>(
    message: T,
    queueUrl: string,
    messageGroupId?: string
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
          MessageDeduplicationId: messageGroupId,
        };
      }
      await this.sqs.sendMessage(queueObj);
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error, queueName });
    }
  }
}
