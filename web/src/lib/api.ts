import { createFetch } from "@better-fetch/fetch";

export const api = createFetch({
    baseURL: typeof window !== "undefined" 
        ? `${window.location.origin}/api` 
        : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api"),
    credentials: "include",
});
