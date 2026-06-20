import type { MiddlewareHandler } from "hono";
import { auth } from "../auth/auth.js";
import { prisma } from "../lib/db.js";

export interface AuthVariables {
    userId: string;
    tenantId: string;
    email: string;
    user: any;
    session: any;
}

export type AuthEnv = {
    Variables: AuthVariables;
};

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
    try {
        const session = await auth.api.getSession({ headers: c.req.raw.headers });

        if (!session || !session.user) {
            return c.json({ error: "Unauthorized" }, 401);
        }

        const userId = session.user.id;
        const email = session.user.email;

        // Determine tenant context
        const requestedTenantId = c.req.header("x-tenant-id");

        let tenantMember;
        if (requestedTenantId) {
            tenantMember = await prisma.tenantMember.findUnique({
                where: {
                    tenantId_userId: {
                        tenantId: requestedTenantId,
                        userId: userId,
                    },
                },
            });
        } else {
            tenantMember = await prisma.tenantMember.findFirst({
                where: { userId: userId },
            });
        }

        if (!tenantMember) {
            return c.json({ error: "Forbidden: No tenant membership found" }, 403);
        }

        // Set context variables with type safety
        c.set("userId", userId);
        c.set("tenantId", tenantMember.tenantId);
        c.set("email", email);
        c.set("user", session.user);
        c.set("session", session.session);

        await next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return c.json({ error: "Internal Server Error" }, 500);
    }
};

