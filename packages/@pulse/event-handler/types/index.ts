export interface ISQSClient {
  sendMessage(message: Record<string, unknown>, queueUrl: string): Promise<void>;
}
