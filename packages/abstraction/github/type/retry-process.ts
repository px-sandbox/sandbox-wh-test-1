export type QueueMessage = {
  processId: string;
  messageBody: string;
  queue: string;
  MessageDeduplicationId: string;
};
