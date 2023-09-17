export interface GHCopilotReport {
  id: string;
  body: {
    dataTimestamp: string;
    lastUsedAt: string;
    isUsedInLastHour: boolean;
    editor: string | null;
    editorVersion: string | null;
    featureUsed: string | null;
    featureVersion: string | null;
    userId: string;
  };
}
