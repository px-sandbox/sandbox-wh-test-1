/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira, Other } from 'abstraction';
import esb from 'elastic-builder';
import { logger } from 'core';
import { searchedDataFormator } from '../../util/response-formatter';

const esClientObj = ElasticSearchClient.getInstance();
function getCycleTimeDetailQuery(
  orgId: string,
  sortKey: Jira.Enums.CycleTimeDetailSortKey,
  sortOrder: 'asc' | 'desc',
  type: Jira.Enums.JiraFilterType,
  sprintId?: string,
  versionId?: string
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
      'body.subtasks',
    ])
    .query(
      esb
        .boolQuery()
        .must([
          type === Jira.Enums.JiraFilterType.SPRINT
            ? esb.termQuery('body.sprintId', sprintId)
            : esb.termQuery('body.fixVersion', versionId),
          esb.termQuery('body.organizationId', orgId),
          esb.termQuery('body.isDeleted', false),
        ])
    );
}

export function getAssigneeQuery(ids: string[], orgId: string): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .size(ids.length)
    .source(['body.displayName', 'body.userId', 'body.emailAddress'])
    .query(
      esb
        .boolQuery()
        .must([esb.termsQuery('body.userId', ids), esb.termQuery('body.organizationId', orgId)])
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
  orgId: string,
  sortKey: Jira.Enums.CycleTimeDetailSortKey,
  sortOrder: 'asc' | 'desc',
  type: Jira.Enums.JiraFilterType,
  sprintId?: string,
  versionId?: string
): Promise<Jira.Type.CycleTimeDetailedType[]> {
  const cycleTimeDetailQuery = getCycleTimeDetailQuery(
    orgId,
    sortKey,
    sortOrder,
    type,
    sprintId,
    versionId
  );
  const orgnameQuery = getOrgNameQuery(orgId);
  let formattedData: [] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[] = [];
  logger.info({
    ...reqCtx,
    message: `fetchCycleTimeDetailed.query:`,
    data: JSON.stringify(cycleTimeDetailQuery.toJSON()),
  });

  const [orgname, formattedCycleTimeData] = await Promise.all([
    searchedDataFormator(
      await esClientObj.search(Jira.Enums.IndexName.Organization, orgnameQuery.toJSON())
    ) as Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]>,
    searchedDataFormator(
      await esClientObj.search(Jira.Enums.IndexName.CycleTime, cycleTimeDetailQuery.toJSON())
    ) as Promise<[] | (Pick<Other.Type.Hit, '_id'> & Other.Type.HitBody)[]>,
  ]);

  formattedData = formattedCycleTimeData.map((fd) => ({
    ...fd,
    subtasks: fd?.subtasks?.length
      ? fd.subtasks.filter((sub: { isDeleted: boolean }) => sub.isDeleted === false)
      : [],
  }));
  const assigneeIds = Array.from(
    new Set(
      formattedData
        .flatMap((fd) => [
          ...fd.assignees.map((assignee: { assigneeId: string }) => assignee.assigneeId),
          ...(fd?.subtasks?.length
            ? fd.subtasks
                .filter(
                  (sub: { assignees: { assigneeId: string }[]; isDeleted?: boolean }) =>
                    sub.isDeleted === false
                )
                .flatMap((sub: { assignees: { assigneeId: string }[] }) =>
                  sub.assignees?.length
                    ? sub.assignees.map((assignee: { assigneeId: string }) => assignee.assigneeId)
                    : []
                )
            : []),
        ])
        .filter(Boolean)
    )
  );

  const userQuery = getAssigneeQuery(assigneeIds, orgId);
  logger.info({
    message: `fetchCycleTimeDetailed.assignee.query:`,
    data: JSON.stringify(userQuery.toJSON()),
  });
  const users = await searchedDataFormator(
    await esClientObj.search(Jira.Enums.IndexName.Users, userQuery.toJSON())
  );

  const userObj: Record<string, { id: string; name: string; email: string }> = {};
  users.forEach((user) => {
    userObj[user.userId] = {
      id: user.userId,
      name: user.displayName,
      email: user.emailAddress,
    };
  });

  return formattedData.map((fd) => ({
    id: fd.id,
    issueKey: fd.issueKey,
    title: fd.title,
    development: {
      coding: parseFloat(fd.development.coding.toFixed(2)),
      pickup: parseFloat(fd.development.pickup.toFixed(2)),
      review: parseFloat(fd.development.review.toFixed(2)),
      handover: parseFloat(fd.development.handover.toFixed(2)),
      total: parseFloat(fd.development.total.toFixed(2)),
    },
    qa: {
      pickup: parseFloat(fd.qa.pickup.toFixed(2)),
      testing: parseFloat(fd.qa.testing.toFixed(2)),
      total: parseFloat(fd.qa.total.toFixed(2)),
    },
    deployment: {
      total: parseFloat(fd.deployment.total.toFixed(2)),
    },
    overall: parseFloat((fd.development.total + fd.qa.total + fd.deployment.total).toFixed(2)),
    overallWithoutDeployment: parseFloat((fd.development.total + fd.qa.total).toFixed(2)),
    assignees: fd.assignees?.length
      ? fd.assignees.map((asgn: { assigneeId: string }) => userObj[asgn.assigneeId])
      : [],
    hasSubtask: fd.hasSubtask,
    subtasks: fd.subtasks?.length
      ? fd.subtasks?.map((sub: { assignees: { assigneeId: string }[]; issueKey: string }) => ({
          ...sub,
          link: `https://${orgname[0]?.name}.atlassian.net/browse/${sub?.issueKey}`,
          assignees: sub?.assignees?.length
            ? sub.assignees.map((asgn: { assigneeId: string }) => userObj[asgn.assigneeId])
            : [],
        }))
      : [],
    link: `https://${orgname[0]?.name}.atlassian.net/browse/${fd?.issueKey}`,
  }));
}
