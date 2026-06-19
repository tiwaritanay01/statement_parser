import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "/api/auth",
    fetchOptions: {
        credentials: "include", // Ensure cookies are sent
    }
});

export const { signIn, signUp, signOut, useSession } = authClient;
