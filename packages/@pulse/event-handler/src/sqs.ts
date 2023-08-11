import { SQS } from 'aws-sdk';
import { logger } from 'core';
import { ISQSClient } from '../types';

export class SQSClient implements ISQSClient {
  private sqs: SQS;

  constructor() {
    this.sqs = new SQS();
  }

  public async sendMessage<T>(
    message: T,
    queueUrl: string,
    messageGroupId?: string
  ): Promise<void> {
    const queueName = queueUrl.split('/').slice(-1).toString();
    try {
      let queueObj: SQS.SendMessageRequest = {
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
      console.log('QUEUE_OBJ', queueObj);
      const res = await this.sqs.sendMessage(queueObj).promise();

      // const res = await this.sqs
      //   .sendMessage({
      //     MessageBody: JSON.stringify(message),
      //     QueueUrl: queueUrl,
      //     MessageGroupId: messageGroupId,
      //   })
      //   .promise();
      logger.info({
        message: 'SQS_SEND_MESSAGE_RESPONSE',
        res,
        queueName,
      });
    } catch (error) {
      logger.error({ message: 'ERROR_SQS_SEND_MESSAGE', error, queueName });
    }
  }
}
