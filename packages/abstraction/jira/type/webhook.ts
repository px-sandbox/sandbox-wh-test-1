export type Webhook = {
  timestamp: number;
  webhookEvent: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
