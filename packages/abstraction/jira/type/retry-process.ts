
export type retryProcess = {
  processId?: string;
};

export type QueueMessage = retryProcess & {
  messageBody: string;
  queue: string;
  MessageDeduplicationId: string;
  MessageGroupId: string;
};
