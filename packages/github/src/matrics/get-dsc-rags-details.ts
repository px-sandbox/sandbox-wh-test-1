import { MetricCategories, Metrics, MetricCategory } from 'abstraction/github/type';
import { activeBranchesAvg } from './get-active-no-of-branches';
import { frequencyOfCodeCommitAvg } from './get-commit-frequency';
import { linesOfCodeAvg } from './get-lines-of-code';
import { prCommentsAvg } from './get-pr-comment';
import { numberOfPrRaisedAvg } from './get-pr-raised-count';
import { prWaitTimeAvg } from './get-pr-wait-time';


async function getMetricAvg(key: string, func: Function, startDate: string, endDate: string, repoIds: string[]) {
    const { value } = await func(startDate, endDate, repoIds);
    return {
        key,
        value
    }
}

export async function getDscRagsDetails(
    startDate: string,
    endDate: string,
    repoIds: string[],
    metricCategories: MetricCategories
): Promise<{ [key: string]: number }> {

    const metrics: Metrics = {
        'number_of_branches': activeBranchesAvg,
        'code_commit_frequency': frequencyOfCodeCommitAvg,
        'lines_of_code': linesOfCodeAvg,
        'number_comments_added_to_prs': prCommentsAvg,
        'number_pr_raised': numberOfPrRaisedAvg,
        'pr_wait_time': prWaitTimeAvg,
        'product_security': prWaitTimeAvg
    }

    const data = await Promise.all(metricCategories.map(async (category: MetricCategory) => {
        return await getMetricAvg(category, metrics[category], startDate, endDate, repoIds)
    }));

    const result = data.reduce((obj: { [key: string]: number }, item) => {
        obj[item.key] = item.value;
        return obj;
    }, {});

    return result;
}
