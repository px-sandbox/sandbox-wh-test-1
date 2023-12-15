export type MetricCategories = [
    'number_comments_added_to_prs',
    'number_of_branches',
    'pr_wait_time',
    'code_commit_frequency',
    'lines_of_code',
    'number_pr_raised',
    'product_security'
];

export type MetricFunction = (
    startDate: string,
    endDate: string,
    repoIds: string[],
    branch?: string
) => Promise<{ value: number | string } | null | string | number>;

/* eslint-disable @typescript-eslint/ban-types */
export type Metrics = {
    [key in string]: Function;
};