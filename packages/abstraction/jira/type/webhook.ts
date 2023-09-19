export type Webhook = {
    timestamp: number;
    webhookEvent: string;
}

// add types for different event payload

// export type IssueUpdateWebhook = {
//     issue_event_type_name: string;
//     user: any;
//     issue: any;
//     changeLog: any
// }