import type { TransactionDTO, CursorPaginationParams, PaginatedResponse } from "@shared/types/index.js";
import { prisma } from "../lib/db.js";
import { encodeCursor, decodeCursor } from "../utils/cursor.js";

export interface CreateTransactionData {
    date: Date;
    description: string;
    amount: number;
    balance: number | null;
    confidence: number;
    currency?: string;
    category?: string;
    metadata?: any;
}

export interface ITransactionRepository {
    findMany(tenantId: string, params: CursorPaginationParams): Promise<PaginatedResponse<TransactionDTO>>;
    findById(tenantId: string, id: string): Promise<TransactionDTO | null>;
    create(tenantId: string, userId: string, data: CreateTransactionData): Promise<TransactionDTO>;
}

export class TransactionRepository implements ITransactionRepository {
    async findMany(tenantId: string, params: CursorPaginationParams): Promise<PaginatedResponse<TransactionDTO>> {
        const limit = params.limit !== undefined ? Number(params.limit) : 10;
        const cursor = params.cursor;

        const queryOptions: any = {
            where: { tenantId },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
        };

        if (cursor) {
            try {
                const decoded = decodeCursor<{ id: string }>(cursor);
                queryOptions.cursor = { id: decoded.id };
                queryOptions.skip = 1; // Skip the cursor element itself to avoid duplicate
            } catch (e) {
                console.error("Failed to decode cursor:", e);
            }
        }

        const transactions = await prisma.transaction.findMany(queryOptions);

        const hasNextPage = transactions.length > limit;
        const data = hasNextPage ? transactions.slice(0, limit) : transactions;

        let nextCursor: string | null = null;
        if (hasNextPage && data.length > 0) {
            const lastItem = data[data.length - 1];
            nextCursor = encodeCursor({ id: lastItem.id });
        }

        // Return mapped TransactionDTOs
        const mappedData: TransactionDTO[] = data.map((t: any) => ({
            id: t.id,
            tenantId: t.tenantId,
            date: t.date,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            category: t.category || undefined,
            metadata: (t.metadata as Record<string, any>) || undefined,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));

        return {
            data: mappedData,
            meta: {
                nextCursor,
                hasNextPage,
                hasPrevPage: !!cursor, // Simplification
            },
        };
    }

    async findById(tenantId: string, id: string): Promise<TransactionDTO | null> {
        const t = await prisma.transaction.findFirst({
            where: { id, tenantId },
        });

        if (!t) return null;

        return {
            id: t.id,
            tenantId: t.tenantId,
            date: t.date,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            category: t.category || undefined,
            metadata: (t.metadata as Record<string, any>) || undefined,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        };
    }

    async create(tenantId: string, userId: string, data: CreateTransactionData): Promise<TransactionDTO> {
        const t = await prisma.transaction.create({
            data: {
                tenantId,
                userId,
                date: data.date,
                description: data.description,
                amount: data.amount,
                balance: data.balance,
                confidence: data.confidence,
                currency: data.currency || "INR",
                category: data.category || null,
                metadata: data.metadata || null,
            },
        });

        return {
            id: t.id,
            tenantId: t.tenantId,
            date: t.date,
            description: t.description,
            amount: t.amount,
            currency: t.currency,
            category: t.category || undefined,
            metadata: (t.metadata as Record<string, any>) || undefined,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        };
    }
}
