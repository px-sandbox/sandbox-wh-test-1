export type Workflow = {
    id: string;
    body: {
        repoId: string;
        organizationId: string;
        package: string;
        version: string;
        releaseDate: string;
        isDeleted: boolean;
        isCore: boolean;
    };
};