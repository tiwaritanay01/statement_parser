import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/auth` : "http://localhost:3000/api/auth",
    fetchOptions: {
        credentials: "include", // Ensure cookies are sent
    }
});

export const { signIn, signUp, signOut, useSession } = authClient;
