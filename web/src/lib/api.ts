import { createFetch } from "@better-fetch/fetch";

export const api = createFetch({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    credentials: "include",
    onRequest: async (context) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem("token");
            if (token) {
                // context.headers is guaranteed to be a Headers instance in better-fetch
                context.headers.set("Authorization", `Bearer ${token}`);
            }
        }
        return context;
    }
});
