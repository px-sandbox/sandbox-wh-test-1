export type SastErrorReport = {
    errorMsg: string;
    errorRuleId: string;
    errorFileName: string;
    errorRepoId: string;
};

export interface ISastErrorAggregationResult {
    errorsBucket: {
        after_key: SastErrorReport,
        buckets: [
            {
                key: SastErrorReport;
                distinctBranchName: {
                    buckets: [
                        {
                            key: string;
                            doc_count: number;
                        }
                    ];
                };
                errorFirstOccurred: {
                    value_as_string: string;
                };
                doc_count: number;
            }
        ];
    };
}

export type SastErrorsAggregation = {
    errorName: string;
    ruleId: string;
    filename: string;
    branch: string[];
    firstOccurredAt: string;
    repoName: string;
}
export type SastErrorsAggregationData = {
    data: SastErrorsAggregation[];
    afterKey: object | undefined;
}
export type SastErrorsData = [{
    _id: string;
    errorMsg: string;
    ruleId: string;
    repoId: string;
    organizationId: string;
    branch: string;
    fileName: string;
    lineNumber: number;
    codeSnippet: string;
    date: string;
    createdAt: string;
    isDeleted: boolean;
}];
