import { Jira } from "../..";

export type Project = 
Omit<Jira.ExternalType.Webhook.Project, 'projectLead'> & 
Pick<Jira.ExternalType.Api.Project, 'lead'> & 
{organization: string}