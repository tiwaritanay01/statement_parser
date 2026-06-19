import { Context } from "hono";
import type { Next } from "hono";

export const tenantMiddleware = async (c: Context, next: Next) => {
    const tenantId = c.req.header("x-tenant-id");
    
    if (!tenantId) {
        return c.json({ error: "Tenant ID missing" }, 400);
    }

    // Optionally verify that c.get("user") has access to tenantId
    
    c.set("tenantId", tenantId);
    await next();
};
