export type SastErrorReport = {
    errorMsg: string;
    errorRuleId: string;
    errorFileName: string;
};

export interface ISastErrorAggregationResponse {
    errorsBucket: {
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
    errorRuleId: string;
    errorFileName: string;
    branchName: string[];
    errorFirstOccurred: string;
}
export type SastErrorsAggregationData = {
    sastErrors: SastErrorsAggregation[];
    totalPages: number;
    page: number;
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
