export interface Version {
    id: string; // Unique identifier for the version entry
    body: {
        projectId: string;
        name: string;
        description: string;
        archived: boolean; 
        overdue: boolean; 
        released: boolean; 
        startDate: string; 
        releaseDate: string;
        isDeleted?: boolean; 
        deletedAt?: string; 
        status?: string | null; 
        projectKey?: string;
    };
}

