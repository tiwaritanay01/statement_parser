import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { Prisma } from "@prisma/client";
import { auth } from "../auth/auth.js";
import { prisma } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const authRouter = new Hono();

// Helper to generate tenant slugs
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    name: z.string().min(1, "Name is required"),
    tenantName: z.string().min(1, "Tenant name is required"),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// POST /api/auth/register
authRouter.post(
    "/register",
    zValidator("json", registerSchema),
    async (c) => {
        const { email, password, name, tenantName } = c.req.valid("json");

        // 1. Check if user already exists to fail fast
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return c.json({ error: "User with this email already exists" }, 400);
        }

        // 2. Register user via Better Auth
        // We use asResponse: true to retrieve cookie headers set by Better Auth
        let authResponse: Response;
        try {
            authResponse = await auth.api.signUpEmail({
                body: { email, password, name },
                asResponse: true,
            });
        } catch (error: any) {
            return c.json({ error: error.message || "Registration failed" }, 400);
        }

        if (!authResponse.ok) {
            const errBody = await authResponse.json();
            return c.json(errBody, authResponse.status as any);
        }

        const data = await authResponse.json();
        const user = data.user;

        // 3. Create Tenant and TenantMember
        try {
            const slug = slugify(tenantName);
            let finalSlug = slug || "tenant";
            let counter = 0;

            // Simple collision check for tenant slug
            while (true) {
                const existingSlug = await prisma.tenant.findUnique({
                    where: { slug: finalSlug },
                });
                if (!existingSlug) break;
                counter++;
                finalSlug = `${slug}-${counter}`;
            }

            await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                const tenant = await tx.tenant.create({
                    data: {
                        name: tenantName,
                        slug: finalSlug,
                    },
                });

                await tx.tenantMember.create({
                    data: {
                        tenantId: tenant.id,
                        userId: user.id,
                        role: "owner",
                    },
                });
            });
        } catch (err) {
            console.error("Multi-tenant registration cleanup triggered due to:", err);
            // Cleanup: delete the created user if tenant setup failed to keep it atomic
            await prisma.user.delete({
                where: { id: user.id },
            }).catch((cleanupErr: any) => {
                console.error("User cleanup failed:", cleanupErr);
            });

            return c.json({ error: "Failed to initialize tenant structure" }, 500);
        }

        // Forward Better Auth set-cookie/auth headers to client, forcing SameSite=None
        authResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                let cookieVal = value.replace(/SameSite=Lax/ig, "SameSite=None");
                if (!/Secure/i.test(cookieVal)) {
                    cookieVal += "; Secure";
                }
                c.header(key, cookieVal);
            } else {
                c.header(key, value);
            }
        });

        return c.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
            message: "Registration successful",
        }, 201);
    }
);

// POST /api/auth/login
authRouter.post(
    "/login",
    zValidator("json", loginSchema),
    async (c) => {
        const { email, password } = c.req.valid("json");

        let authResponse: Response;
        try {
            authResponse = await auth.api.signInEmail({
                body: { email, password },
                asResponse: true,
            });
        } catch (error: any) {
            return c.json({ error: error.message || "Login failed" }, 400);
        }

        if (!authResponse.ok) {
            const errBody = await authResponse.json();
            return c.json(errBody, authResponse.status as any);
        }

        const data = await authResponse.json();

        // Forward Better Auth set-cookie/auth headers to client, forcing SameSite=None
        authResponse.headers.forEach((value, key) => {
            if (key.toLowerCase() === 'set-cookie') {
                let cookieVal = value.replace(/SameSite=Lax/ig, "SameSite=None");
                if (!/Secure/i.test(cookieVal)) {
                    cookieVal += "; Secure";
                }
                c.header(key, cookieVal);
            } else {
                c.header(key, value);
            }
        });

        console.log("SET COOKIE:", authResponse.headers.get("set-cookie"));

        return c.json(data);
    }
);

// GET /api/auth/me
authRouter.get("/me", authMiddleware, async (c) => {
    const userId = c.get("userId");
    const tenantId = c.get("tenantId");
    const email = c.get("email");

    return c.json({
        userId,
        tenantId,
        email,
    });
});

export { authRouter };
