import { Github } from 'pulse-abstraction';
import { GIT_ORGANIZATION_ID } from 'src/constant/config';
import { v4 as uuid } from 'uuid';

export async function repoFormator(
  data: Github.ExternalType.Repository,
  oldId?: string
): Promise<Object> {
  const obj = {
    id: oldId || uuid(),
    body: {
      id: `gh_repo_${data.id}`,
      githubRepoId: data.id,
      name: data.name,
      description: data?.description,
      isPrivate: data.private,
      owner: data.owner.login,
      visibility: data.visibility,
      organizationId: `gh_org_${GIT_ORGANIZATION_ID}`,
      openIssuesCount: data.open_issues_count,
      createdAt: data.created_at,
      pushedAt: data.pushed_at,
      updatedAt: data.updated_at,
      deletedAt: false,
    },
  };
  return obj;
}
