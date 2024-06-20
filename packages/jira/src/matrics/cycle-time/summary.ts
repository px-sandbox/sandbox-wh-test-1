/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
import { ElasticSearchClient } from '@pulse/elasticsearch';
import { Jira } from 'abstraction';
import esb from 'elastic-builder';

const esClientObj = ElasticSearchClient.getInstance();

function getQuery(sprintArr: string[], orgId: string): esb.RequestBodySearch {
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

  return esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must([
          esb.termsQuery('body.sprintId', sprintArr),
          esb.termQuery('body.organizationId', orgId),
          esb.termQuery('body.isDeleted', false),
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
  orgId: string
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

  const response: Jira.Type.CycleTimeSummaryResponse[] = [];
  if (sprintArr.length > 0) {
    sprintArr.map((sprintId) => {
      const bucket = result?.sprints?.buckets?.find((b) => b.key === sprintId);
      if (bucket) {
        if (result?.sprints?.buckets) {
          response.push({
            sprintId: bucket.key,
            development: {
              coding: parseFloat(bucket.avg_development_coding.value.toFixed(2)),
              pickup: parseFloat(bucket.avg_development_pickup.value.toFixed(2)),
              handover: parseFloat(bucket.avg_development_handover.value.toFixed(2)),
              review: parseFloat(bucket.avg_development_review.value.toFixed(2)),
              total: parseFloat(bucket.avg_development_total.value.toFixed(2)),
            },
            qa: {
              pickup: parseFloat(bucket.avg_qa_pickup.value.toFixed(2)),
              testing: parseFloat(bucket.avg_qa_testing.value.toFixed(2)),
              total: parseFloat(bucket.avg_qa_total.value.toFixed(2)),
            },
            deployment: {
              total: parseFloat(bucket.avg_deployment_total.value.toFixed(2)),
            },
            overall: parseFloat(bucket.overall.value.toFixed(2)),
            overallWithoutDeployment: parseFloat(bucket.overallWithoutDeployment.value.toFixed(2)),
          });
        }
      } else {
        response.push({
          sprintId,
          development: {
            coding: 0,
            pickup: 0,
            handover: 0,
            review: 0,
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
          overall: 0,
          overallWithoutDeployment: 0,
        });
      }
      return response;
    });
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
 * @param sprintLevelSum - An array of sprint level summaries.
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
    data.development.coding = parseFloat((data.development.coding / len).toFixed(2));
    data.development.pickup = parseFloat((data.development.pickup / len).toFixed(2));
    data.development.review = parseFloat((data.development.review / len).toFixed(2));
    data.development.handover = parseFloat((data.development.handover / len).toFixed(2));
    data.development.total = parseFloat((data.development.total / len).toFixed(2));

    data.qa.pickup = parseFloat((data.qa.pickup / len).toFixed(2));
    data.qa.testing = parseFloat((data.qa.testing / len).toFixed(2));
    data.qa.total = parseFloat((data.qa.total / len).toFixed(2));

    data.deployment.total = parseFloat((data.deployment.total / len).toFixed(2));
  }
  return data;
}
