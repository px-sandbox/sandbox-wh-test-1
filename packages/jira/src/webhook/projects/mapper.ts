import { Jira } from "abstraction";


/**
 * Maps the Jira project keys to the corresponding fields in the Pulse data integration system.
 * @param body - The Jira project object received in the webhook payload.
 * @param createdAt - The timestamp when the project was created.
 * @param organization - The name of the organization that the project belongs to.
 * @param updatedAt - The timestamp when the project was last updated. Defaults to `createdAt`.
 * @param deletedAt - The timestamp when the project was deleted. Defaults to `null`.
 * @returns The mapped project object.
 */
export function projectKeysMapper(
    body: Jira.ExternalType.Webhook.Project,
    createdAt: string,
    organization: string,
    updatedAt: string = createdAt,
    deletedAt: string | null = null
): Jira.Mapped.Project {
    const { projectLead, ...rest } = body;
    return {
        lead: projectLead,
        organization,
        isDeleted: !!deletedAt,
        deletedAt,
        createdAt,
        updatedAt,
        ...rest
    };
}