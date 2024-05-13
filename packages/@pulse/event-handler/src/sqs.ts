import AWS_SQS, { SQS } from '@aws-sdk/client-sqs';
import { logger } from 'core';
import { Other } from 'abstraction';
import { ISQSClient } from '../types';

export class SQSClient implements ISQSClient {
  private sqs: SQS;
  // eslint-disable-next-line no-use-before-define
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
    reqCtx: Other.Type.RequestCtx,
    messageGroupId: string,
    messageDeduplicationId: string
  ): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      const queueObj: AWS_SQS.SendMessageCommandInput = {
        MessageBody: JSON.stringify({ message, reqCtx }),
        QueueUrl: queueUrl,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageDeduplicationId,
      };
      await this.sqs.sendMessage(queueObj);
    } catch (error) {
      logger.error({
        message: 'SQSClient.sendFifoMessage.ERROR_SQS_SEND_MESSAGE',
        error,
        data: { queueName },
        ...reqCtx,
      });
    }
  }

  public async sendMessage<T>(
    message: T,
    queueUrl: string,
    reqCtx: Other.Type.RequestCtx,
    messageGroupId?: string,
    MessageDeduplicationId?: string
  ): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      let queueObj: AWS_SQS.SendMessageCommandInput = {
        MessageBody: JSON.stringify({ message, reqCtx }),
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
      logger.error({
        ...reqCtx,
        message: 'SQSClient.sendMessage.ERROR_SQS_SEND_MESSAGE',
        error,
        data: queueName,
      });
    }
  }
}
