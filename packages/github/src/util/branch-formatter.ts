import { Github } from 'abstraction';
import { GIT_ORGANIZATION_ID } from 'src/constant/config';
import { v4 as uuid } from 'uuid';

export async function branchFormator(
	data: Github.ExternalType.Api.Branch,
	oldId?: string
): Promise<Object> {
	const obj = {
		id: oldId || uuid(),
		body: {
			id: `gh_branch_${data.id}`,
			githubBranchId: data.id,
			name: data.name,
			organizationId: `gh_org_${GIT_ORGANIZATION_ID}`,
			repoId: `gh_repo_${data.repo_id}`,
			createdAt: data?.created_at || null,
			pushedAt: data?.pushed_at || null,
			updatedAt: data?.updated_at || null,
			deletedAt: false,
		},
	};
	return obj;
}
