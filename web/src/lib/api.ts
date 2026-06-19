import { createFetch } from "@better-fetch/fetch";

export const api = createFetch({
    baseURL: "/api",
    credentials: "include",
});
