import { createFetch } from "@better-fetch/fetch";

export const api = createFetch({
    baseURL: "http://localhost:3000/api",
    credentials: "include",
});
