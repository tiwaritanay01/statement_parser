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
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: [
        process.env.FRONTEND_URL || "http://localhost:3001",
    ],
    advanced: {
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true,
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
