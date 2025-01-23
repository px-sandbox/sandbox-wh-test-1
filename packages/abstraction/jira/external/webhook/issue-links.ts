export type IssueLinks = {
  destinationIssueId: string;
  sourceIssueId: string;
  id: string;
  issueLinkType: {
    id: string;
    inwardName: string;
    name: string;
    isSubTaskLinkType: boolean;
    outwardName: string;
    isSystemLinkType: boolean;
  };
  systemLink: boolean;
};
