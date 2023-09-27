import { Jira } from "abstraction";

/**
 * Maps the project keys from the Jira webhook payload to the desired format.
 * @param body - The project object from the Jira webhook payload.
 * @returns The mapped project object.
 */
export function projectKeysMapper(body: Jira.ExternalType.Webhook.Project, organization:string)
: Jira.ExternalType.Api.Project{
    const mappedBody:Jira.ExternalType.Api.Project= {
        self: body.self,
        organization,
        id: body.id,
        key: body.key,
        name: body.name,
        avatarUrls: body.avatarUrls,
        lead: body.projectLead,
        assigneeType: body.assigneeType,
        isDeleted: false,
        deletedAt: null,
        updatedAt: null
    };
    return mappedBody;
}