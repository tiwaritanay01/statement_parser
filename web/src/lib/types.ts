export interface Transaction {
    id: string;
    tenantId: string;
    userId: string;
    date: string;
    description: string;
    amount: number;
    balance: number | null;
    confidence: number;
    rawText: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        nextCursor: string | null;
        limit: number;
    };
}
