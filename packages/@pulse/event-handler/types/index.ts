import { Other } from 'abstraction';

export interface ISQSClient {
  sendMessage(
    message: Record<string, unknown>,
    queueUrl: string,
    reqCtx: Other.Type.RequestCtx
  ): Promise<void>;
  sendFifoMessage(
    message: Record<string, unknown>,
    queueUrl: string,
    reqCtx: Other.Type.RequestCtx,
    messageGroupId: string,
    messageDeduplicationId: string
  ): Promise<void>;
}
