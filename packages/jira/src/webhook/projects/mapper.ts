import { Jira } from "abstraction";

/**
 * Maps the project keys from the Jira webhook payload to the desired format.
 * @param body - The project object from the Jira webhook payload.
 * @returns The mapped project object.
 */
export function projectKeysMapper(body: Jira.ExternalType.Webhook.Project, organization:string)
: Jira.ExternalType.Api.Project{
    const {projectLead, ...rest} = body;
    return {
    lead: projectLead,
    organization,
    ...rest
    }; 
}