import { Github } from 'abstraction';
import { GIT_ORGANIZATION_ID } from 'src/constant/config';
import { v4 as uuid } from 'uuid';

export async function branchFormator(
  data: Github.ExternalType.Api.Branch,
  oldId?: string
): Promise<Github.Type.Branch> {
  const obj = {
    id: oldId || uuid(),
    body: {
      id: `gh_branch_${data.id}`,
      githubBranchId: data.id,
      name: data.name,
      organizationId: `gh_org_${GIT_ORGANIZATION_ID}`,
      repoId: `gh_repo_${data.repo_id}`,
      createdAt: data?.created_at,
      pushedAt: data?.pushed_at,
      updatedAt: data?.updated_at,
      deletedAt: false,
    },
  };
  return obj;
}

export async function updateBranchFormator(
  data: Github.ExternalType.Api.Branch,
  oldId: string
): Promise<Object> {
  let dataArray = {} as any;
  if ('action' in data) {
    dataArray['action'] = data.action;
  }
  if ('deleted_at' in data) {
    dataArray['deletedAt'] = data.deleted_at;
  }
  const obj = {
    id: oldId,
    body: dataArray,
  };

  return obj;
}
