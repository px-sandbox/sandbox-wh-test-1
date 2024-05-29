/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';

const esClientObj = ElasticSearchClient.getInstance();

function getQuery(sprintArr: string[], orgId: string): esb.RequestBodySearch {
  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId.keyword', sprintArr),
          esb.termQuery('body.organizationId', orgId),
        ])
    )

    .source(['body.sprintId'])
    .agg(
      esb
        .termsAggregation('sprints', 'body.sprintId.keyword')
        .agg(esb.sumAggregation('total_development_coding', 'body.development.coding'))
        .agg(esb.sumAggregation('total_development_pickup', 'body.development.pickup'))
        .agg(esb.sumAggregation('total_development_handover', 'body.development.handover'))
        .agg(esb.sumAggregation('total_development_review', 'body.development.review'))
        .agg(esb.sumAggregation('total_development_total', 'body.development.total'))

        .agg(esb.sumAggregation('total_qa_pickup', 'body.qa.pickup'))
        .agg(esb.sumAggregation('total_qa_testing', 'body.qa.testing'))
        .agg(esb.sumAggregation('total_qa_handover', 'body.qa.handover'))
        .agg(esb.sumAggregation('total_qa_total', 'body.qa.total'))

        .agg(esb.sumAggregation('total_deployment_total', 'body.deployment.total'))
    );
}

/**
 * Sorts the cycle time summary array based on the specified key and order.
 *
 * @param response - The cycle time summary array to be sorted.
 * @param key - The key to determine the sorting criteria.
 * @param order - The order of sorting ('asc' for ascending, 'desc' for descending).
 * @returns The sorted cycle time summary array.
 */
function sortCycleTime(
  response: Jira.Type.CycleTimeSummary[] | undefined,
  key: Jira.Enums.CycleTimeSortKey,
  order: 'asc' | 'desc'
): Jira.Type.CycleTimeSummary[] | undefined {
  const direction = order === 'desc' ? 1 : -1;

  switch (key) {
    case Jira.Enums.CycleTimeSortKey.DEPLOYMENT:
      response?.sort((a, b) => direction * (b.deployment.total - a.deployment.total));
      break;
    case Jira.Enums.CycleTimeSortKey.DEVELOPMENT_CODING:
      response?.sort((a, b) => direction * (b.development.coding - a.development.coding));
      break;
    case Jira.Enums.CycleTimeSortKey.DEVELOPMENT_HANDOVER:
      response?.sort((a, b) => direction * (b.development.handover - a.development.handover));
      break;
    case Jira.Enums.CycleTimeSortKey.DEVELOPMENT_PICKUP:
      response?.sort((a, b) => direction * (b.development.pickup - a.development.pickup));
      break;
    case Jira.Enums.CycleTimeSortKey.DEVELOPMENT_REVIEW:
      response?.sort((a, b) => direction * (b.development.review - a.development.review));
      break;

    case Jira.Enums.CycleTimeSortKey.OVERALL_WITHOUT_DEPLOYMENT:
      response?.sort(
        (a, b) => direction * (b.overallWithoutDeployment - a.overallWithoutDeployment)
      );
      break;
    case Jira.Enums.CycleTimeSortKey.QA_HANDOVER:
      response?.sort((a, b) => direction * (b.qa.handover - a.qa.handover));
      break;
    case Jira.Enums.CycleTimeSortKey.QA_PICKUP:
      response?.sort((a, b) => direction * (b.qa.pickup - a.qa.pickup));
      break;
    case Jira.Enums.CycleTimeSortKey.QA_TESTING:
      response?.sort((a, b) => direction * (b.qa.testing - a.qa.testing));
      break;
    case Jira.Enums.CycleTimeSortKey.DEVELOPMENT:
      response?.sort((a, b) => direction * (b.development.total - a.development.total));
      break;
    case Jira.Enums.CycleTimeSortKey.QA:
      response?.sort((a, b) => direction * (b.qa.total - a.qa.total));
      break;
    default:
      response?.sort((a, b) => direction * (b.overall - a.overall));
  }
  return response;
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
  sortKey: Jira.Enums.CycleTimeSortKey,
  sortOrder: 'asc' | 'desc'
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

  const summaryQuery = getQuery(sprintArr, orgId);

  const result = await esClientObj.queryAggs<Jira.Type.SprintLevelSummaryResult>(
    Jira.Enums.IndexName.CycleTime,
    summaryQuery.toJSON()
  );

  let response;
  if (result?.sprints?.buckets) {
    response = result?.sprints?.buckets?.map((bucket) => ({
      sprintId: bucket.key,
      development: {
        coding: bucket.total_development_coding.value / bucket.doc_count,
        pickup: bucket.total_development_pickup.value / bucket.doc_count,
        handover: bucket.total_development_handover.value / bucket.doc_count,
        review: bucket.total_development_review.value / bucket.doc_count,
        total: bucket.total_development_total.value / bucket.doc_count,
      },
      qa: {
        pickup: bucket.total_qa_pickup.value / bucket.doc_count,
        testing: bucket.total_qa_testing.value / bucket.doc_count,
        handover: bucket.total_qa_handover.value / bucket.doc_count,
        total: bucket.total_qa_total.value / bucket.doc_count,
      },
      deployment: {
        total: bucket.total_deployment_total.value / bucket.doc_count,
      },
      overall:
        (bucket.total_development_total.value +
          bucket.total_qa_total.value +
          bucket.total_deployment_total.value) /
        bucket.doc_count,
      overallWithoutDeployment:
        (bucket.total_development_total.value + bucket.total_qa_total.value) / bucket.doc_count,
    }));
  }

  response = response?.map((item) => ({
    ...item,
    sprintName: sprintObj[item.sprintId]?.name,
    startDate: sprintObj[item.sprintId]?.startDate,
    endDate: sprintObj[item.sprintId]?.endDate,
    status: sprintObj[item.sprintId]?.status,
  }));

  return sortCycleTime(response, sortKey, sortOrder);
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
      handover: 0,
      total: 0,
    },
    deployment: {
      total: 0,
    },
  };
  const len = sprintLevelSumm.length;
  sprintLevelSumm.forEach((sls) => {
    data.development.coding += sls.development.coding;
    data.development.pickup += sls.development.pickup;
    data.development.review += sls.development.review;
    data.development.handover += sls.development.handover;
    data.development.total += sls.development.total;

    data.qa.pickup += sls.qa.pickup;
    data.qa.testing += sls.qa.testing;
    data.qa.total += sls.qa.total;

    data.deployment.total += sls.deployment.total;
  });
  // Calculate the average after summing up all items
  data.development.coding /= len;
  data.development.pickup /= len;
  data.development.review /= len;
  data.development.handover /= len;
  data.development.total /= len;

  data.qa.pickup /= len;
  data.qa.testing /= len;
  data.qa.total /= len;

  data.deployment.total /= len;
  return data;
}
