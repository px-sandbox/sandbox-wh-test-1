export interface Organization {
  id: string; // uuid
  body: {
    id: string; // jira_org_${jira organisation id}
    orgId: string; // jira id
    name: string; // org name
    url: string; // for ex: https://narendra-local.atlassian.net
    scopes: Array<string>;
    avtarUrl: string;
    credId: string; // ponts to credentials saved in DyanamoDb
    createdAt: string;
  };
}
