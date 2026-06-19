import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "../lib/db.js";
import { jwt, bearer } from "better-auth/plugins";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-for-development-only-replace-me-1234567890",
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: process.env.FRONTEND_URL 
        ? [process.env.FRONTEND_URL, "http://localhost:3001", "http://127.0.0.1:3001"] 
        : ["http://localhost:3001", "http://127.0.0.1:3001"],
    advanced: {
        crossSubDomainCookies: {
            enabled: true,
        }
    },
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
        updateAge: 60 * 60 * 24,    // 1 day in seconds
    },
    plugins: [
        bearer(),
        jwt({
            jwt: {
                expirationTime: "7d",
            }
        })
    ]
});
