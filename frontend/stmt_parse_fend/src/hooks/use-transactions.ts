import { TransactionDTO, CursorPaginationParams, PaginatedResponse } from "@shared/types";
import { useState } from "react";
// import apiClient from "../services/api.client";

export function useTransactions(tenantId: string) {
    const [data, setData] = useState<PaginatedResponse<TransactionDTO> | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchTransactions = async (params: CursorPaginationParams) => {
        setLoading(true);
        // const res = await apiClient.get(...)
        // setData(res.data);
        setLoading(false);
    };

    return { data, loading, fetchTransactions };
}
