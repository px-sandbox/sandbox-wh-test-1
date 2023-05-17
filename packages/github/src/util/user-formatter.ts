import { Github } from 'abstraction';
import { GIT_ORGANIZATION_ID } from 'src/constant/config';
import { v4 as uuid } from 'uuid';

export async function userFormator(
	data: Github.ExternalType.Api.User,
	oldId?: string
): Promise<Github.Type.User> {
	const obj = {
		id: oldId || uuid(),
		body: {
			id: `gh_user_${data?.id}`,
			githubUserId: data?.id,
			userName: data?.login,
			avatarUrl: data?.avatar_url,
			organizationId: `gh_org_${GIT_ORGANIZATION_ID}`,
			deletedAt: '',
		},
	};
	return obj;
}
