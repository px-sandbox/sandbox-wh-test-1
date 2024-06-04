import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
function getCycleTimeDetailQuery(
  sprintId: string,
  orgId: string,
  sortKey: Jira.Enums.CycleTimeDetailSortKey,
  sortOrder: 'asc' | 'desc'
): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .size(200)
    .sort(esb.sort(`body.${sortKey}`, sortOrder))
    .source([
      'body.id',
      'body.issueKey',
      'body.title',
      'body.development',
      'body.qa',
      'body.deployment',
      'body.assignees',
      'body.hasSubtask',
      'body.subtask',
    ])
    .query(
      esb
        .boolQuery()
        .must([
          esb.termQuery('body.sprintId', sprintId),
          esb.termQuery('body.organizationId', orgId),
        ])
    );
}

export function getAssigneeQuery(ids: string[], orgId: string): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .source(['body.displayName', 'body.id', 'body.emailAddress'])
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.id', ids), esb.termQuery('body.organizationId', orgId)])
    );
}

function getOrgNameQuery(orgId: string): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .source(['body.name'])
    .query(esb.boolQuery().must(esb.termQuery('body.id', orgId)));
}
export async function fetchCycleTimeDetailed(
  reqCtx: Other.Type.RequestCtx,
  sprintId: string,
  orgId: string,
  sortKey: Jira.Enums.CycleTimeDetailSortKey,
  sortOrder: 'asc' | 'desc'
): Promise<Jira.Type.CycleTimeDetailedType[]> {
  const cycleTimeDetailQuery = getCycleTimeDetailQuery(sprintId, orgId, sortKey, sortOrder);
  const orgnameQuery = getOrgNameQuery(orgId);

  const [orgname, formattedData] = await Promise.all([
    searchedDataFormator(
      await esClientObj.search(Jira.Enums.IndexName.Organization, orgnameQuery.toJSON())
    ) as Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]>,
    searchedDataFormator(
      await esClientObj.search(Jira.Enums.IndexName.CycleTime, cycleTimeDetailQuery.toJSON())
    ) as Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]>,
  ]);

  const assigneeIds = [
    ...new Set(
      formattedData.flatMap((fd) => [
        ...fd.assignees.map((assignee: { assigneeId: string }) => assignee.assigneeId),
        ...fd.subtask.flatMap((sub: { assignees: { assigneeId: string }[] }) =>
          sub.assignees.map((assignee: { assigneeId: string }) => assignee.assigneeId)
        ),
      ])
    ),
  ];

  const userQuery = getAssigneeQuery(assigneeIds, orgId);
  const users = await searchedDataFormator(
    await esClientObj.search(Jira.Enums.IndexName.Users, userQuery.toJSON())
  );

  const userObj: Record<string, { id: string; name: string; email: string }> = {};
  users.forEach((user) => {
    userObj[user.id] = {
      id: user.id,
      name: user.displayName,
      email: user.emailAddress,
    };
  });
  return formattedData.map((fd) => ({
    id: fd.id,
    issueKey: fd.issueKey,
    title: fd.title,
    development: fd.development,
    qa: fd.qa,
    deployment: fd.deployment,
    assignees: fd.assignees.map((asgn: { assigneeId: string }) => userObj[asgn.assigneeId]),
    hasSubtask: fd.hasSubtask,
    subtask: fd.subtask.map((sub: { assignees: { assigneeId: string }[] }) => ({
      ...sub,
      assignees: sub.assignees.map((asgn: { assigneeId: string }) => userObj[asgn.assigneeId]),
    })),
    link: `https://${orgname}.atlassian.net/browse/${fd?.issueKey}`,
  }));
}
