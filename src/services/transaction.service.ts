import type { ITransactionRepository } from "../repositories/transaction.repository.js";
import type { TransactionDTO, CursorPaginationParams, PaginatedResponse } from "@shared/types/index.js";
import { parseTransaction } from "./parser.service.js";

export class TransactionService {
    constructor(private transactionRepo: ITransactionRepository) {}

    async getTransactions(tenantId: string, params: CursorPaginationParams): Promise<PaginatedResponse<TransactionDTO>> {
        return this.transactionRepo.findMany(tenantId, params);
    }

    async extractTransaction(tenantId: string, userId: string, text: string): Promise<TransactionDTO> {
        const parsed = parseTransaction(text);
        return this.transactionRepo.create(tenantId, userId, parsed);
    }
}
