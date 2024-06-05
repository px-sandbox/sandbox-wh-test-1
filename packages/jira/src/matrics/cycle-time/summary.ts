/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';

const esClientObj = ElasticSearchClient.getInstance();

function getQuery(
  sprintArr: string[],
  orgId: string,
  sortKey?: Jira.Enums.CycleTimeSortKey,
  sortOrder?: 'asc' | 'desc'
): esb.RequestBodySearch {
  const baseAgg = esb
    .termsAggregation('sprints', 'body.sprintId')
    .agg(esb.avgAggregation('avg_development_coding', 'body.development.coding'))
    .agg(esb.avgAggregation('avg_development_pickup', 'body.development.pickup'))
    .agg(esb.avgAggregation('avg_development_handover', 'body.development.handover'))
    .agg(esb.avgAggregation('avg_development_review', 'body.development.review'))
    .agg(esb.avgAggregation('avg_development_total', 'body.development.total'))

    .agg(esb.avgAggregation('avg_qa_pickup', 'body.qa.pickup'))
    .agg(esb.avgAggregation('avg_qa_testing', 'body.qa.testing'))
    .agg(esb.avgAggregation('avg_qa_handover', 'body.qa.handover'))
    .agg(esb.avgAggregation('avg_qa_total', 'body.qa.total'))

    .agg(esb.avgAggregation('avg_deployment_total', 'body.deployment.total'))

    .agg(
      esb
        .bucketScriptAggregation('overall')
        .bucketsPath({
          devTotal: 'avg_development_total',
          qaTotal: 'avg_qa_total',
          depTotal: 'avg_deployment_total',
        })
        .script('params.devTotal + params.qaTotal + params.depTotal')
    )

    .agg(
      esb
        .bucketScriptAggregation('overallWithoutDeployment')
        .bucketsPath({
          devTotal: 'avg_development_total',
          qaTotal: 'avg_qa_total',
          depTotal: 'avg_deployment_total',
        })
        .script('params.devTotal + params.qaTotal')
    );
  if (sortKey) {
    baseAgg.agg(esb.bucketSortAggregation('sorted').sort([esb.sort(sortKey, sortOrder)]));
  }
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintArr),
          esb.termQuery('body.organizationId', orgId),
        ])
    )

    .source(['body.sprintId'])
    .agg(baseAgg);
}

/**
 * Calculates the sprint level summary for cycle time.
 * @param sprints - An array of sprint objects containing sprint details.
 * @param orgId - The ID of the organization.
 * @param sortKey - The key to sort the cycle time summary.
 * @param sortOrder - The order to sort the cycle time summary ('asc' or 'desc').
 * @returns A promise that resolves to an array of cycle time summary objects, or undefined if there is no result.
 */
export async function sprintLevelSummaryCalc(
  sprints: {
    sprintId: string;
    status: Jira.Enums.SprintState;
    name: string;
    startDate: string;
    endDate: string;
  }[],
  orgId: string,
  sortKey?: Jira.Enums.CycleTimeSortKey,
  sortOrder?: 'asc' | 'desc'
): Promise<Jira.Type.CycleTimeSummary[] | undefined> {
  const sprintArr = sprints.map((sp) => sp.sprintId);
  const sprintObj: {
    [key: string]: {
      sprintId: string;
      status: Jira.Enums.SprintState;
      name: string;
      startDate: string;
      endDate: string;
    };
  } = {};
  sprints.forEach((sp) => {
    sprintObj[sp.sprintId] = {
      sprintId: sp.sprintId,
      status: sp.status,
      name: sp.name,
      startDate: sp.startDate,
      endDate: sp.endDate,
    };
  });

  const summaryQuery = getQuery(sprintArr, orgId, sortKey, sortOrder);

  const result = await esClientObj.queryAggs<Jira.Type.SprintLevelSummaryResult>(
    Jira.Enums.IndexName.CycleTime,
    summaryQuery.toJSON()
  );

  let response;
  if (result?.sprints?.buckets) {
    response = result?.sprints?.buckets?.map((bucket) => ({
      sprintId: bucket.key,
      development: {
        coding: bucket.avg_development_coding.value,
        pickup: bucket.avg_development_pickup.value,
        handover: bucket.avg_development_handover.value,
        review: bucket.avg_development_review.value,
        total: bucket.avg_development_total.value,
      },
      qa: {
        pickup: bucket.avg_qa_pickup.value,
        testing: bucket.avg_qa_testing.value,
        handover: bucket.avg_qa_handover.value,
        total: bucket.avg_qa_total.value,
      },
      deployment: {
        total: bucket.avg_deployment_total.value,
      },
      overall: bucket.overall.value,
      overallWithoutDeployment: bucket.overallWithoutDeployment.value,
    }));
  }

  return response?.map((item) => ({
    ...item,
    sprintName: sprintObj[item.sprintId]?.name,
    startDate: sprintObj[item.sprintId]?.startDate,
    endDate: sprintObj[item.sprintId]?.endDate,
    status: sprintObj[item.sprintId]?.status,
  }));
}

/**
 * Calculates the overall summary of cycle time.
 * @param sprintLevelSumm - An array of sprint level summaries.
 * @returns The overall summary of cycle time.
 */
export function overallSummary(
  sprintLevelSumm: Jira.Type.CycleTimeSummary[]
): Jira.Type.CycleTimeOverallSummary {
  const data = {
    development: {
      coding: 0,
      pickup: 0,
      review: 0,
      handover: 0,
      total: 0,
    },
    qa: {
      pickup: 0,
      testing: 0,
      total: 0,
    },
    deployment: {
      total: 0,
    },
  };
  const len = sprintLevelSumm.length;

  sprintLevelSumm.forEach((sls) => {
    data.development.coding += sls.development.coding ?? 0;
    data.development.pickup += sls.development.pickup ?? 0;
    data.development.review += sls.development.review ?? 0;
    data.development.handover += sls.development.handover ?? 0;
    data.development.total += sls.development.total ?? 0;

    data.qa.pickup += sls.qa.pickup ?? 0;
    data.qa.testing += sls.qa.testing ?? 0;
    data.qa.total += sls.qa.total ?? 0;

    data.deployment.total += sls.deployment.total ?? 0;
  });
  // Calculate the average after summing up all items
  if (len) {
    data.development.coding /= len;
    data.development.pickup /= len;
    data.development.review /= len;
    data.development.handover /= len;
    data.development.total /= len;

    data.qa.pickup /= len;
    data.qa.testing /= len;
    data.qa.total /= len;

    data.deployment.total /= len;
  }
  return data;
}
