export type Workflow = {
    id: string;
    body: {
        repoId: string;
        organizationId: string;
        name: string;
        libName: string;
        version: string;
        releaseDate: string;
        isDeleted: boolean;
        isCore: boolean;
    };
};