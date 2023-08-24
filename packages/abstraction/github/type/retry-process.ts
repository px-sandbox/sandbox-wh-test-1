export type ProcessItRecord = {
  processId: string;
  messageBody: string;
  queue: string;
  MessageDeduplicationId: string;
};
