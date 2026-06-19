import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required");
}
if (!process.env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL is required");
}

import { apiRouter } from './routes/index.js';
import { auth } from './auth/auth.js';

const app = new Hono();

// Enable CORS globally
app.use(
    '*',
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3001',
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    })
);

// Mount the custom apiRouter (includes /api/auth/register, login, me, etc.)
app.route('/api', apiRouter);

// Handle OPTIONS explicitly to let Hono CORS middleware do its job instead of Better Auth's strict internal CORS
app.options('/api/auth/*', (c) => c.body(null, 204));

// Fallback catch-all for Better Auth's internal handlers
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

app.get('/', (c) => {
    return c.text('Hello Hono!');
});

app.get("/debug/env", (c) => {
    return c.json({
        FRONTEND_URL: process.env.FRONTEND_URL,
        NODE_ENV: process.env.NODE_ENV,
    });
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

serve(
    {
        fetch: app.fetch,
        port: port,
    },
    (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
    }
);
