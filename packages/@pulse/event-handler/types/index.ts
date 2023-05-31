export interface ISQSClient {
  sendMessage(queuUrl: string, message: Object): Promise<void>;
}
