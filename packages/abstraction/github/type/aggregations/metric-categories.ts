export type MetricCategories = [
    'number_comments_added_to_prs',
    'number_of_branches',
    'pr_wait_time',
    'code_commit_frequency',
    'lines_of_code',
    'number_pr_raised',
    'product_security'
];

export type MetricCategory =
    | 'number_of_branches'
    | 'code_commit_frequency'
    | 'lines_of_code'
    | 'number_comments_added_to_prs'
    | 'number_pr_raised'
    | 'pr_wait_time'
    | 'product_security';

export type MetricFunction = (
    startDate: string,
    endDate: string,
    repoIds: string[]
) => Promise<{ value: number | string } | null | string>;

export type Metrics = {
    [key in MetricCategory]: MetricFunction;
};