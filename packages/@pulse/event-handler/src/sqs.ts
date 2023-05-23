import { SQS } from 'aws-sdk';
import { ISQSClient } from '../types';

export class SQSClient implements ISQSClient {
  private sqs: SQS;

  constructor() {
    this.sqs = new SQS();
  }

  public async sendMessage(message: Object, queueUrl: string): Promise<void> {
    await this.sqs
      .sendMessage({
        MessageBody: JSON.stringify(message),
        QueueUrl: queueUrl,
      })
      .promise();
  }
}
