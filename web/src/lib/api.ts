import { createFetch } from "@better-fetch/fetch";

export const api = createFetch({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
    credentials: "include",
});
