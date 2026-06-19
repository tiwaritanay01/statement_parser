import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { authMiddleware, type AuthEnv } from "../middleware/auth.middleware.js";
import { TransactionRepository } from "../repositories/transaction.repository.js";
import { TransactionService } from "../services/transaction.service.js";

const transactionRepository = new TransactionRepository();
const transactionService = new TransactionService(transactionRepository);

const transactionRouter = new Hono<AuthEnv>();

// Protect all transaction endpoints
transactionRouter.use("*", authMiddleware);

const extractSchema = z.object({
    text: z.string().min(1, "Text is required"),
});

// POST /api/transactions/extract
transactionRouter.post(
    "/extract",
    zValidator("json", extractSchema),
    async (c) => {
        const { text } = c.req.valid("json");
        const tenantId = c.get("tenantId");
        const userId = c.get("userId");

        try {
            const result = await transactionService.extractTransaction(tenantId, userId, text);
            return c.json(result, 201);
        } catch (error: any) {
            console.error("Extraction route error:", error);
            return c.json({ error: error.message || "Failed to extract transaction" }, 500);
        }
    }
);

// GET /api/transactions
transactionRouter.get("/", async (c) => {
    const tenantId = c.get("tenantId");
    const cursor = c.req.query("cursor");
    const limitQuery = c.req.query("limit");
    const limit = limitQuery ? parseInt(limitQuery, 10) : undefined;

    try {
        const result = await transactionService.getTransactions(tenantId, { cursor, limit });
        return c.json(result);
    } catch (error: any) {
        console.error("Get transactions route error:", error);
        return c.json({ error: error.message || "Failed to fetch transactions" }, 500);
    }
});

export { transactionRouter };
