import { Metrics } from 'abstraction/github/type';
import { activeBranchesAvg } from '../matrics/get-active-no-of-branches';
import { frequencyOfCodeCommitAvg } from '../matrics/get-commit-frequency';
import { linesOfCodeAvg } from '../matrics/get-lines-of-code';
import { prCommentsAvg } from '../matrics/get-pr-comment';
import { numberOfPrRaisedAvg } from '../matrics/get-pr-raised-count';
import { prWaitTimeAvg } from '../matrics/get-pr-wait-time';
import { getHeadlineStat } from '../matrics/get-product-security';

export const metrics: Metrics = {
  number_of_branches: activeBranchesAvg,
  code_commit_frequency: frequencyOfCodeCommitAvg,
  lines_of_code: linesOfCodeAvg,
  number_comments_added_to_prs: prCommentsAvg,
  number_pr_raised: numberOfPrRaisedAvg,
  pr_wait_time: prWaitTimeAvg,
  product_security: getHeadlineStat,
};

/* eslint-disable @typescript-eslint/ban-types */
export async function getMetricAvg(
  key: string,
  func: Function,
  startDate: string,
  endDate: string,
  repoIds: string[]
): Promise<{ key: string; value: number }> {
  const { value } = await func(startDate, endDate, repoIds);
  return {
    key,
    value,
  };
}
